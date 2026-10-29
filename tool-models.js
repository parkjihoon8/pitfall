window.makePitfallTool=function(T,id){
  const goldScanner=id==='gold_scanner';if(goldScanner)id='scanner';
  if(!['ladder','torch','headlamp','scanner'].includes(id)&&!id.endsWith('_drill')&&!window.PitfallIndustry?.colors[id])return null;
  const g=new T.Group(),color=window.PitfallInventory.TOOLS[id]?.color||'#8ca99b';
  const part=(geo,c,x,y,z)=>{const m=new T.Mesh(geo,new T.MeshStandardMaterial({color:c,roughness:.55}));m.position.set(x,y,z);g.add(m);return m;};
  const box=(w,h,d,c,x=0,y=0,z=0)=>part(new T.BoxGeometry(w,h,d),c,x,y,z);
  if(window.PitfallIndustry?.colors[id]){const c=PitfallIndustry.colors[id];
    if(['coal','copper','iron','gold'].includes(id))part(new T.DodecahedronGeometry(.2),c,0,0,0);
    else if(id==='copper_wire'){part(new T.TorusGeometry(.16,.035,8,20),c,0,0,0);part(new T.TorusGeometry(.12,.025,8,20),c,0,0,.04);}
    else if(id==='conveyor'){box(.4,.12,.7,c);for(let z=-.3;z<.35;z+=.1)box(.38,.02,.02,'#c4b784',0,.07,z);}
    else if(id==='vertical_conveyor'){for(const x of [-.2,.2])box(.04,.8,.15,c,x);for(let y=-.3;y<.4;y+=.15)box(.4,.035,.2,'#c4b784',0,y);}
    else if(id==='furnace'){box(.4,.5,.35,c);box(.22,.2,.02,'#ef9d45',0,-.06,.19);box(.1,.25,.1,'#34474c',0,.35);}
    else if(id==='storage_chest'){box(.5,.35,.3,c);box(.06,.38,.32,'#36484b',-.16);box(.06,.38,.32,'#36484b',.16);}
    else box(.4,id==='iron_plate'?.04:.13,.24,c);return g;
  }
  if(id==='ladder'){for(const x of [-.17,.17])box(.035,.8,.04,'#b88755',x);for(let y=-.32;y<.4;y+=.14)box(.34,.025,.04,'#d6aa73',0,y);}
  if(id==='torch'){box(.065,.5,.065,'#8a5b35',0,-.12);part(new T.OctahedronGeometry(.13),'#ffb43c',0,.2,0);}
  if(id==='headlamp'){part(new T.SphereGeometry(.23,12,8,0,Math.PI*2,0,Math.PI/2),'#e0ad53',0,-.1,0);box(.45,.055,.36,'#544d3b',0,-.08);part(new T.SphereGeometry(.09,12,8),'#d8f6ff',0,.02,.22);}
  if(id==='scanner'){box(.32,.42,.12,goldScanner?'#dfb748':'#527c6f');box(.25,.23,.015,'#143e36',0,.04,.07);part(new T.TorusGeometry(.08,.007,5,24),'#8ef0aa',0,.04,.085);box(.025,.23,.025,'#b8c8bd',-.12,.3);box(.06,.03,.02,'#e5be71',0,-.15,.075);}
  if(id.endsWith('_drill')){
    // Side-on silhouette keeps the spiral bit readable in first person.
    box(.27,.27,.4,color,0,.1);box(.15,.28,.16,'#29383d',0,-.15,.08);box(.23,.09,.25,color,0,-.31,.08);
    box(.06,.06,.05,'#f0bd58',0,-.06,-.04);
    const chuck=part(new T.CylinderGeometry(.1,.12,.13,16),'#39474c',0,.1,-.26);chuck.rotation.x=Math.PI/2;
    const bit=part(new T.CylinderGeometry(.025,.025,.45,10),'#bccdd4',0,.1,-.54);bit.rotation.x=Math.PI/2;
    const points=[];for(let i=0;i<=180;i++){const t=i/180,a=t*Math.PI*10,r=.065*(1-t*.65);points.push(new T.Vector3(Math.cos(a)*r,.1+Math.sin(a)*r,-.32-t*.45));}
    part(new T.TubeGeometry(new T.CatmullRomCurve3(points),180,.018,6,false),'#e0ebef',0,0,0);
    const tip=part(new T.ConeGeometry(.028,.09,10),'#e9f4fa',0,.1,-.8);tip.rotation.x=-Math.PI/2;
    for(let z=.02;z<.18;z+=.045)box(.012,.12,.018,'#26393d',.141,.1,z);
    g.rotation.y=-.65;
  }
  return g;
};
