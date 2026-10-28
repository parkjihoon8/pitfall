/* Continuous excavation field used by the live chunk renderer.
 * Continuous rock field with small spherical cuts; no cell-sized deletion.
 */
(function(root){
  'use strict';
  function create(world,raw){
    let saved={};try{saved=JSON.parse(raw)||{};}catch{}
    if(!saved.floorDrillMigration){saved.cuts=(saved.cuts||[]).filter(c=>c.y>=0).map(c=>({...c,drill:false}));saved.floorDrillMigration=true;}
    if(!saved.cylinderFloorReset){saved.cuts=(saved.cuts||[]).filter(c=>!c.drill&&c.y>=0);saved.cylinderFloorReset=true;}
    const seed=Number.isInteger(saved.seed)?saved.seed>>>0:Math.floor(Math.random()*4294967296);
    let rng=seed;function random(){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;}
    // Seeded once: revisiting/reloading never moves the buried chamber.
    const side=random()<.5?-1:1,z=-20-random()*205,b=world.bounds(z);
    const chamber={x:(side<0?b.left:b.right)+side*(12+random()*9),z,side,radius:5.5,height:4};
    const cuts=(Array.isArray(saved.cuts)?saved.cuts:[]).filter(c=>c&&[c.x,c.y,c.z,c.r].every(Number.isFinite)&&Math.abs(c.x)<90&&c.z>world.Z_MIN-24&&c.z<world.Z_MAX+24&&c.r>0&&c.r<=1.2&&c.y>=-24&&c.y<=3.8).map(c=>({...c}));
    const state={floorDrillMigration:true,cylinderFloorReset:true,discovered:saved.discovered===true,veins:saved.veins&&typeof saved.veins==='object'?saved.veins:{},collapses:Number.isInteger(saved.collapses)?saved.collapses:0,totalCuts:Number.isInteger(saved.totalCuts)?saved.totalCuts:cuts.length};
    const bins=new Map(),chunkSize=4;
    const key=(x,y,z)=>Math.floor(x)+','+Math.floor(y)+','+Math.floor(z);
    function index(c){for(let x=Math.floor(c.x-c.r);x<=Math.floor(c.x+c.r);x++)for(let y=Math.floor(c.y-c.r);y<=Math.floor(c.y+c.r);y++)for(let z=Math.floor(c.z-c.r);z<=Math.floor(c.z+c.r);z++){const k=x+','+y+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(c);}}
    cuts.forEach(index);
    // Positive = solid, negative = air. The surface at zero is triangulated later.
    function density(x,y,z){
      if(z<world.Z_MIN-24||z>world.Z_MAX+24||Math.abs(x)>90)return 10;
      const b=world.bounds(z),rock=Math.max(b.left-x,x-b.right,world.Z_MIN-z,z-world.Z_MAX);
      let value=Math.max(rock,-y);
      const room=Math.max(Math.hypot(x-chamber.x,z-chamber.z)-chamber.radius,Math.abs(y-2)-chamber.height/2);
      value=Math.min(value,room);
      for(const c of bins.get(key(x,y,z))||[]){const sphere=Math.hypot(x-c.x,y-c.y,z-c.z)-c.r;const cylinder=Math.max(Math.hypot(x-c.x,z-c.z)-c.r,Math.abs(y-c.y)-c.r);const floor=Number.isFinite(c.floorY)?Math.max(-24,Math.min(0,c.floorY)):0;value=Math.min(value,c.drill?cylinder:Math.max(sphere,floor-y));}
      // Uncuttable floor/roof prevent floating steps and upward escape.
      if(y< -24)value=Math.max(value,-24-y);
      if(x>-13&&x<0&&z>1&&z<12&&y<0)value=Math.max(value,-y);
      if(y>4.2&&rock>0)value=Math.max(value,y-4.2);
      return value;
    }
    function strike(point,normal,radius=.42,drill=false,floorY=0){
      if(!point||!normal||![point.x,point.y,point.z,normal.x,normal.y,normal.z].every(Number.isFinite))return null;
      if(point.y< -23.5)return null;
      if(point.x>-13&&point.x<0&&point.z>1&&point.z<12&&point.y<.1)return null;
      if(point.y>3.4)return {roof:true};
      const len=Math.hypot(normal.x,normal.y,normal.z);if(len<.001)return null;
      const r=Math.max(.42,Math.min(1.2,Number(radius)||.42)),depth=r/3;
      const c={x:point.x-normal.x/len*depth,y:point.y-normal.y/len*depth,z:point.z-normal.z/len*depth,r,drill,floorY:Number.isFinite(floorY)?Math.max(-24,Math.min(0,floorY)):0};
      c.y=Math.max(-24,Math.min(3.8,c.y));
      // Repeated clicks into already empty space must not award resources.
      let material=density(c.x,c.y,c.z)>.001||density(point.x,point.y,point.z)>-.1;
      if(!material)for(const a of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[.58,.58,.58],[-.58,.58,.58],[.58,-.58,-.58],[-.58,-.58,-.58]])if(density(c.x+a[0]*.3,c.y+a[1]*.3,c.z+a[2]*.3)>.015){material=true;break;}
      if(!material)return null;
      cuts.push(c);index(c);state.totalCuts++;
      const dirty=[];for(let x=Math.floor((c.x-r)/chunkSize);x<=Math.floor((c.x+r)/chunkSize);x++)for(let z=Math.floor((c.z-r)/chunkSize);z<=Math.floor((c.z+r)/chunkSize);z++)dirty.push([x,z]);
      return {cut:{...c},dirty};
    }
    function free(x,z,r=.38,airY=0){for(const y of [.22,.6,1.15,1.75])for(let a=0;a<Math.PI*2;a+=Math.PI/4)if(density(x+Math.cos(a)*r,y+airY,z+Math.sin(a)*r)>-.01)return false;return true;}
    function cleanup(at){
      // Components connected to the sampling boundary or floor remain supported.
      // Only small, fully enclosed solid components become air, in both physics and mesh.
      const step=.2,n=13,half=1.2,total=n*n*n,solid=new Uint8Array(total),seen=new Uint8Array(total),removed=[],dirty=new Set();
      const index3=(x,y,z)=>(y*n+z)*n+x,point=(x,y,z)=>({x:at.x-half+x*step,y:at.y-half+y*step,z:at.z-half+z*step});
      for(let y=0;y<n;y++)for(let z=0;z<n;z++)for(let x=0;x<n;x++){const p=point(x,y,z);solid[index3(x,y,z)]=density(p.x,p.y,p.z)>0?1:0;}
      for(let y=0;y<n;y++)for(let z=0;z<n;z++)for(let x=0;x<n;x++){
        const start=index3(x,y,z);if(!solid[start]||seen[start])continue;const queue=[[x,y,z]],component=[];seen[start]=1;let anchored=false;
        for(let head=0;head<queue.length;head++){const [a,b,c]=queue[head],p=point(a,b,c);component.push(p);if(a===0||b===0||c===0||a===n-1||b===n-1||c===n-1||p.y<.2)anchored=true;
          for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const xx=a+dx,yy=b+dy,zz=c+dz;if(xx<0||yy<0||zz<0||xx>=n||yy>=n||zz>=n)continue;const k=index3(xx,yy,zz);if(solid[k]&&!seen[k]){seen[k]=1;queue.push([xx,yy,zz]);}}
        }
        if(!anchored&&component.length<400)removed.push(...component);
      }
      for(const p of removed){const c={...p,r:.16};cuts.push(c);index(c);for(let x=Math.floor((c.x-.2)/4);x<=Math.floor((c.x+.2)/4);x++)for(let z=Math.floor((c.z-.2)/4);z<=Math.floor((c.z+.2)/4);z++)dirty.add(x+','+z);}
      return {removed:removed.length,dirty:[...dirty].map(k=>k.split(',').map(Number))};
    }
    function collapse(at){const removed=[];for(let i=cuts.length-1;i>=0;i--)if(Math.hypot(cuts[i].x-at.x,cuts[i].z-at.z)<1.1){removed.push(cuts[i]);cuts.splice(i,1);}bins.clear();cuts.forEach(index);state.collapses++;return removed;}
    return {density,strike,free,state,collapse,cleanup,chamber:{...chamber},get cuts(){return cuts.map(c=>({...c}));},serialize:()=>JSON.stringify({version:2,seed,cuts,...state}),get count(){return cuts.length;}};
  }
  root.PitfallTerrainField={create};if(typeof module!=='undefined')module.exports=root.PitfallTerrainField;
})(typeof window!=='undefined'?window:globalThis);

