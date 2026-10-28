(function(root){
  'use strict';
  const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  function build(field,cx,cz,step=.25){
    const local=field.cuts.filter(c=>c.x+c.r>=cx*4&&c.x-c.r<=(cx+1)*4&&c.z+c.r>=cz*4&&c.z-c.r<=(cz+1)*4);
    const bottom=Math.floor(Math.min(-.5,...local.map(c=>c.y-c.r-.5))*2)/2;
    const size=4,n=Math.round(size/step),ny=Math.ceil((4.5-bottom)/step),dy=(4.5-bottom)/ny,positions=[],nx=n+1,nz=n+1;
    const values=new Float32Array(nx*(ny+1)*nz),idx=(x,y,z)=>(y*nz+z)*nx+x;
    for(let y=0;y<=ny;y++)for(let z=0;z<=n;z++)for(let x=0;x<=n;x++)values[idx(x,y,z)]=field.density(cx*size+x*step,bottom+y*dy,cz*size+z*step);
    function tri(a,b,c,air){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      if(normal.reduce((s,v,i)=>s+v*air[i],0)<0)[b,c]=[c,b];positions.push(...a,...b,...c);}
    for(let y=0;y<ny;y++)for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      const c=[[x,y,z],[x+1,y,z],[x+1,y,z+1],[x,y,z+1],[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]],vs=c.map(a=>values[idx(...a)]);
      if(vs.every(v=>v>=0)||vs.every(v=>v<0))continue;
      const ps=c.map(a=>[cx*size+a[0]*step,bottom+a[1]*dy,cz*size+a[2]*step]);
      for(const t of tetra){const solid=t.filter(i=>vs[i]>=0),empty=t.filter(i=>vs[i]<0);if(!solid.length||!empty.length)continue;
        const lerp=(a,b)=>{const f=vs[a]/(vs[a]-vs[b]);return ps[a].map((v,i)=>v+(ps[b][i]-v)*f);};
        const air=[0,1,2].map(k=>empty.reduce((s,i)=>s+ps[i][k],0)/empty.length-solid.reduce((s,i)=>s+ps[i][k],0)/solid.length);
        if(solid.length===1){const p=empty.map(i=>lerp(solid[0],i));tri(...p,air);}
        else if(empty.length===1){const p=solid.map(i=>lerp(empty[0],i));tri(...p,air);}
        else{const a=lerp(solid[0],empty[0]),b=lerp(solid[0],empty[1]),c=lerp(solid[1],empty[0]),d=lerp(solid[1],empty[1]);tri(a,b,c,air);tri(b,d,c,air);}
      }
    }
    return positions;
  }
  root.PitfallTerrainMesh={build};if(typeof module!=='undefined')module.exports=root.PitfallTerrainMesh;
})(typeof window!=='undefined'?window:globalThis);
