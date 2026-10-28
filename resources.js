window.buildPitfallMine=function({T,world,scene,modelCache}){
  const resources=[],gems={quartz:0xa4d8ef,emerald:0x4fcb92,ruby:0xe5687c,diamond:0xb6efff},toolMaterials={};
  // Reproducible coverage in every stretch, including enough materials near camp.
  for(let z=28,n=0;z>world.Z_MIN+8;z-=9,n++)for(let lane=0;lane<3;lane++){
    const zz=z+Math.sin(n*3+lane)*2,b=world.bounds(zz),x=b.left+4+(b.right-b.left-8)*(lane+.3)/3;
    if(world.free(x,zz,.65))resources.push({key:'surface-v2-'+n+'-'+lane,id:(n+lane)%2?'stick':'stone',count:1,x,z:zz});
  }
  for(const [i,v] of [[0,[2,17]],[1,[5,13]],[2,[1,9]],[3,[4,5]],[4,[0,2]]])resources.push({key:'starter-v2-'+i,id:i<3?'stick':'stone',count:1,x:v[0],z:v[1]});
  const group=new T.Group();scene.add(group);
  function spawn(data){
    const g=new T.Group();g.position.set(data.x,(Number.isFinite(data.y)?data.y:0)+.05,data.z);g.userData.interaction={kind:'pickup',data};g.name=data.key;group.add(g);
    let obj;const special=window.makePitfallTool(T,data.id);
    if(special){obj=special;obj.position.y=.42;}
    else if(data.id==='boots'){obj=new T.Mesh(new T.BoxGeometry(.3,.4,.45),new T.MeshStandardMaterial({color:0x80d9ca}));obj.position.y=.2;}
    else if(gems[data.id]){obj=new T.Mesh(new T.OctahedronGeometry(.24),new T.MeshStandardMaterial({color:gems[data.id],emissive:gems[data.id],emissiveIntensity:.2,roughness:.3,flatShading:true}));obj.position.y=.25;}
    else{const a=modelCache[data.id==='stick'?'tree-log-small':data.id==='stone'?'resource-stone':'tool-pickaxe'],tool=PitfallInventory.TOOLS[data.id];let material=a.material;if(tool&&data.id!=='pickaxe'){if(!toolMaterials[data.id]){toolMaterials[data.id]=a.material.clone();toolMaterials[data.id].color.set(tool.color);}material=toolMaterials[data.id];}obj=new T.Mesh(a.geo,material);obj.scale.setScalar((tool?.9:.7)/Math.max(a.size.x,a.size.y,a.size.z));}
    obj.rotation.y=data.z*.71;obj.castShadow=true;g.add(obj);
    const halo=new T.Mesh(new T.RingGeometry(.32,.39,20),new T.MeshBasicMaterial({color:gems[data.id]||0xe6c48c,side:T.DoubleSide,transparent:true,opacity:.4}));halo.rotation.x=-Math.PI/2;halo.position.y=.015;g.add(halo);return g;
  }
  return {resources,spawn,gems};
};
