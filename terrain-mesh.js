(function(root){
  'use strict';
  const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  function build(field,cx,cz,step=.25){
    // Every chunk must sample the same world lattice, including untouched neighbours.
    const size=4,n=12;step=size/n;
    const local=field.cuts.filter(c=>c.x+c.r>=cx*4&&c.x-c.r<=(cx+1)*4&&c.z+c.r>=cz*4&&c.z-c.r<=(cz+1)*4);
    const y0=Math.floor(Math.min(-.5,...local.map(c=>c.y-c.r-.5))/step),y1=Math.ceil(4.5/step),ny=y1-y0,positions=[],nx=n+1,nz=n+1;
    const values=new Float32Array(nx*(ny+1)*nz),idx=(x,y,z)=>(y*nz+z)*nx+x;
    for(let y=0;y<=ny;y++)for(let z=0;z<=n;z++)for(let x=0;x<=n;x++)values[idx(x,y,z)]=field.density((cx*n+x)*step,(y0+y)*step,(cz*n+z)*step);
    function tri(a,b,c,air){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      if(normal.reduce((s,v,i)=>s+v*air[i],0)<0)[b,c]=[c,b];positions.push(...a,...b,...c);}
    for(let y=0;y<ny;y++)for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      const c=[[x,y,z],[x+1,y,z],[x+1,y,z+1],[x,y,z+1],[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]],vs=c.map(a=>values[idx(...a)]);
      if(vs.every(v=>v>=0)||vs.every(v=>v<0))continue;
      const ps=c.map(a=>[(cx*n+a[0])*step,(y0+a[1])*step,(cz*n+a[2])*step]);
      for(const t of tetra){const solid=t.filter(i=>vs[i]>=0),empty=t.filter(i=>vs[i]<0);if(!solid.length||!empty.length)continue;
        const lerp=(a,b)=>{const f=vs[a]/(vs[a]-vs[b]);return ps[a].map((v,i)=>v+(ps[b][i]-v)*f);};
        const air=[0,1,2].map(k=>empty.reduce((s,i)=>s+ps[i][k],0)/empty.length-solid.reduce((s,i)=>s+ps[i][k],0)/solid.length);
        if(solid.length===1){const p=empty.map(i=>lerp(solid[0],i));tri(...p,air);}
        else if(empty.length===1){const p=solid.map(i=>lerp(empty[0],i));tri(...p,air);}
        else{const a=lerp(solid[0],empty[0]),b=lerp(solid[0],empty[1]),c=lerp(solid[1],empty[0]),d=lerp(solid[1],empty[1]);tri(a,b,c,air);tri(b,d,c,air);}
      }
    }
    // Narrow overlap at chunk borders seals rasterisation hairlines without smoothing rock faces.
    const originalLength=positions.length;
    for(let i=0;i<originalLength;i+=9)for(let e=0;e<3;e++){
      const a=positions.slice(i+e*3,i+e*3+3),b=positions.slice(i+((e+1)%3)*3,i+((e+1)%3)*3+3);
      if(Math.hypot(...a.map((v,k)=>v-b[k]))<1e-7)continue;
      for(const [axis,plane,offset] of [[0,cx*4,-.025],[0,(cx+1)*4,.025],[2,cz*4,-.025],[2,(cz+1)*4,.025]]){
        if(Math.abs(a[axis]-plane)>1e-6||Math.abs(b[axis]-plane)>1e-6)continue;
        const c=a.slice(),d=b.slice();c[axis]+=offset;d[axis]+=offset;positions.push(...a,...b,...c,...b,...d,...c);
      }
    }
    return positions;
  }
  root.PitfallTerrainMesh={build};if(typeof module!=='undefined')module.exports=root.PitfallTerrainMesh;
})(typeof window!=='undefined'?window:globalThis);
