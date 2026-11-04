window.buildPitfallDiscovery=function({T,scene,world,p,model,modelCache,box,cylinder,segment,rock,mat,exploration,giveLoot,toast,online,getProgress}){
  const R=PitfallDiscoveryRules,siteViews=new Map(),roomViews=new Map();
  const canyonRock=mat(0x985334),deepRock=mat(0x5f463c),bone=mat(0xd7c498),metal=mat(0x385955),cream=mat(0xd8d0ae),warm=mat(0xd88a50),dark=mat(0x243c39);
  function asset(name,x,y,z,height,rotation,parent=scene){const a=modelCache[name],m=new T.Mesh(a.geo,a.material);m.position.set(x,y,z);m.scale.setScalar(height/a.size.y);m.rotation.y=rotation;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function label(text,parent,y=2.35){const cv=document.createElement('canvas');cv.width=512;cv.height=128;const c=cv.getContext('2d');c.fillStyle='#244843';c.fillRect(0,0,512,128);c.fillStyle='#edc58b';c.font='bold 42px sans-serif';c.textAlign='center';c.fillText(text,256,80);const tx=new T.CanvasTexture(cv);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(2.2,.55),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));m.position.set(0,y,1.53);parent.add(m);}
  function makeSite(id,site,index){
    const {x,z}=site,group=new T.Group();group.name='secret-site-'+id;scene.add(group);
    const floor=new T.Mesh(new T.CircleGeometry(2.35,12),mat(index===2?0x4b403b:0x8b664d));floor.rotation.x=-Math.PI/2;floor.position.set(x,.028,z);floor.receiveShadow=true;group.add(floor);
    for(const side of [-1,1])rock(index===1?'rock_tallC':'rock_tallA',x+side*2.15,0,z+.25,1.7,3.8+index*.4,2.2,index===2?deepRock:canyonRock);
    rock('rock_largeE',x,2.7,z+1.25,5.1,1.5,1.8,index===2?deepRock:canyonRock);
    if(index===0){asset('bedroll',x-1.05,.06,z-.7,.18,.2,group);asset('bottle-large',x+.9,.05,z-.75,.45,0,group);segment([x-1.7,.15,z+1.4],[x-1.35,2.4,z+1.4],.04,metal);}
    if(index===1){for(let i=-2;i<=2;i++){const a=[x+i*.55,.08,z+.9],b=[x+i*.55,1.45-Math.abs(i)*.12,z-.2];segment(a,b,.06,bone);segment(b,[x+i*.55,.08,z-1.1],.05,bone);}asset('bottle-large',x-1.2,.05,z-.65,.4,0,group);}
    if(index===2){const colors=[0x8ad8e8,0xb98ce1,0x72d6c0];for(let i=0;i<9;i++){const crystal=new T.Mesh(new T.OctahedronGeometry(.18+(i%3)*.08),mat(colors[i%3],{emissive:colors[i%3],emissiveIntensity:.35}));crystal.position.set(x-1.5+(i%5)*.7,.22+(i%2)*.22,z+.65-Math.floor(i/5)*1.35);crystal.scale.y=1.8;group.add(crystal);}}
    const chest=model('chest',x,.05,z-.45,1.05,Math.PI);chest.name='secret-cache-'+id;chest.material=chest.material.clone();chest.userData.interaction={kind:'secret',id,name:site.name};
    const light=new T.PointLight(index===2?0x9de9ff:0xffcf85,8,6,2);light.position.set(x,1.2,z-.35);scene.add(light);siteViews.set(id,{group,chest,light});
  }
  Object.entries(R.SITES).forEach(([id,site],i)=>makeSite(id,site,i));
  const roomSpecs={map:{name:'지도실',x:-12.75,z:8,color:0x6e9d94},storage:{name:'창고실',x:-7.4,z:.9,color:0xc58b54},smelter:{name:'제련실',x:-1.65,z:4.3,color:0xbb6544},power:{name:'발전실',x:-1.65,z:8.15,color:0x5f908b}};
  function makeRoom(id){const s=roomSpecs[id],g=new T.Group();g.position.set(s.x,0,s.z);g.name='base-room-'+id;scene.add(g);const wall=mat(cream.color.getHex()),accent=mat(s.color),width=id==='storage'?3.3:2.8,depth=2.8;
    box(0,.04,0,width,.08,depth,metal,g);box(0,2.65,0,width+.15,.14,depth+.15,metal,g);box(0,1.35,-depth/2,width,2.7,.16,wall,g);box(-width/2,1.35,0,.16,2.7,depth,wall,g);box(width/2,1.35,0,.16,2.7,depth,wall,g);box(0,.92,-depth/2-.09,width,.22,.03,accent,g);box(-width*.34,1.3,depth/2,.35,2.6,.16,metal,g);box(width*.34,1.3,depth/2,.35,2.6,.16,metal,g);label(s.name,g);
    world.box(s.x,s.z-depth/2,width,.16);world.box(s.x-width/2,s.z,.16,depth);world.box(s.x+width/2,s.z,.16,depth);
    if(id==='map'){box(0,1.25,-1.25,1.8,1.15,.06,dark,g);for(let i=0;i<5;i++){const pin=new T.Mesh(new T.SphereGeometry(.045,6,5),mat(i%2?0xffce76:0x8ee0d2));pin.position.set(-.65+i*.3,1.2+(i%3)*.2,-1.19);g.add(pin);}asset('workbench',0,.05,.25,.9,Math.PI,g);}
    if(id==='storage'){for(const [i,x] of [-1,0,1].entries())asset(i===1?'box-large':'box',x*.82,.05,-.35+(i%2)*.75,.72+i*.08,i*.3,g);}
    if(id==='smelter'){asset('barrel',-.65,.05,-.25,.9,0,g);asset('workbench-anvil',.65,.05,-.3,.8,Math.PI,g);for(const x of [-.75,0,.75])cylinder(x,1.75,-1.25,.08,1.6,metal,g);}
    if(id==='power'){for(const x of [-.65,.65]){const cell=cylinder(x,.8,-.25,.34,1.45,dark,g);const glow=cylinder(x,.8,-.25,.23,1.2,mat(0x7fe0d0,{emissive:0x55ccb8,emissiveIntensity:1.2}),g);cell.add(glow);}const l=new T.PointLight(0x9ffff0,12,8,2);l.position.set(0,2,0);g.add(l);}
    roomViews.set(id,g);toast(s.name+' 확장 완료');
  }
  let roomIds=[];
  function refresh(){const next=R.rooms(getProgress());for(const id of next)if(!roomViews.has(id))makeRoom(id);roomIds=next;updateCaches();}
  function updateCaches(){const opened=new Set(exploration.state.openedSecrets||[]);for(const [id,v] of siteViews){const done=opened.has(id);v.chest.scale.y=done ? .65 : 1;v.chest.material.color.set(done?0x6f675d:0xffffff);v.light.intensity=done?1.5:8;v.chest.userData.interaction.opened=done;}}
  function open(hit){const site=R.SITES[hit.id];if(!site)return false;if((exploration.state.openedSecrets||[]).includes(hit.id)){toast('이미 비어 있는 탐사 상자입니다.');return true;}if(online){online.action({type:'secret',id:hit.id});return true;}let loot;try{loot=R.claim(exploration.state,hit.id);}catch(error){toast(error.message);return true;}for(const reward of loot)for(let n=0;n<reward.count;n++)giveLoot(reward.id);exploration.persist();updateCaches();refresh();toast(site.name+' 발견 · 희귀 보급품을 회수했습니다.');return true;}
  function drawMap(ctx,X,Z,mapExpanded){const opened=new Set(exploration.state.openedSecrets||[]),reveal=roomIds.includes('map'),visible=Object.entries(R.SITES).filter(([id])=>reveal||opened.has(id));for(const [id,s] of visible){ctx.save();ctx.translate(X(s.x),Z(s.z));if(mapExpanded)ctx.scale(.7,.7);ctx.fillStyle=opened.has(id)?'#6b6256':'#ffd36f';ctx.strokeStyle='#284943';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(7,0);ctx.lineTo(0,7);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}return visible.length;}
  function zone(){let best=null;for(const [id,s] of Object.entries(R.SITES)){const d=Math.hypot(p.x-s.x,p.z-s.z);if(d<7&&(!best||d<best.d))best={d,name:s.name,id};}return best?.name||'';}
  refresh();
  return {open,refresh,drawMap,zone,diagnostics:()=>({sites:Object.entries(R.SITES).map(([id,s])=>({id,name:s.name,x:s.x,z:s.z})),chests:siteViews.size,opened:[...(exploration.state.openedSecrets||[])],rooms:[...roomIds]})};
};
