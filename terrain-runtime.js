window.buildExcavation=function({T,world,scene,mat,box,cylinder,segment,model}){
  let raw,legacyMigration=false;try{raw=localStorage.getItem('pitfall-terrain-v2');if(!raw&&localStorage.getItem('pitfall-dig-v1')){legacyMigration=true;localStorage.setItem('pitfall-dig-v1-backup',localStorage.getItem('pitfall-dig-v1'));}}catch{}
  const field=PitfallTerrainField.create(world,raw),chunks=new Map(),group=new T.Group(),effects=new T.Group();scene.add(group,effects);
  try{localStorage.setItem('pitfall-terrain-v2',field.serialize());}catch{}
  world.setUnderground(field.free);
  world.density=field.density;
  const material=mat(0xbd8559,{side:T.DoubleSide,flatShading:false}),wood=mat(0x66503a),iron=mat(0x46524e),colors={quartz:0xa4d8ef,emerald:0x4fcb92,ruby:0xe5687c,diamond:0xb6efff};
  const chamber=field.chamber,veins=[],particles=[],chipGeo=new T.TetrahedronGeometry(.065);let shake=0,pending=null,stress=0,lastHit=0;
  const lantern=new T.PointLight(0xffd5a3,15,10,2);scene.add(lantern);
  const impactLight=new T.PointLight(0xccefff,0,5,2);scene.add(impactLight);
  let deposits=[];try{deposits=(JSON.parse(raw)?.deposits||[]).filter(d=>d.gem!=='diamond'||d.y< -5);}catch{}field.state.deposits=deposits;
  if(!deposits.some(d=>d.id==='buried-0')){let seed=field.seed||173;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<420;i++){const z=world.Z_MIN+5+rand()*(world.Z_MAX-world.Z_MIN-10),b=world.bounds(z),floor=i%2===0,y=floor?-2-rand()*19:1+rand()*2,x=floor?b.left+rand()*(b.right-b.left):(i%4===1?b.left-1-rand()*14:b.right+1+rand()*14),gem=floor&&y< -9&&rand()<.08?'diamond':['quartz','emerald','ruby'][Math.floor(rand()*3)];deposits.push({id:'buried-'+i,x,y,z,gem});}}
  // Stable supplemental deposits also upgrade existing saves without refilling mined veins.
  for(let i=0;i<20;i++)for(let lane=0;lane<3;lane++){const id='diamond-supply-v1-'+i+'-'+lane;if(deposits.some(d=>d.id===id))continue;const z=world.Z_MAX-10-i*14+(lane-1)*2,b=world.bounds(z),x=b.left+(b.right-b.left)*(.22+lane*.28),y=-6.5-((i+lane)%4)*2;deposits.push({id,gem:'diamond',x,y,z});}
  try{localStorage.setItem('pitfall-terrain-v2',field.serialize());}catch{}
  function deposit(data){if((field.state.veins[data.id]||0)>=3)return;const g=new T.Group();g.position.set(data.x,data.y,data.z);g.userData.interaction={kind:'vein',id:data.id,gem:data.gem};for(let i=0;i<3;i++){const crystal=new T.Mesh(new T.OctahedronGeometry(.16),mat(colors[data.gem],{emissive:colors[data.gem],emissiveIntensity:.3}));crystal.position.set((i-1)*.17,i*.07,0);g.add(crystal);}scene.add(g);veins.push({id:data.id,gem:data.gem,g});}
  for(const d of deposits)if(d&&colors[d.gem]&&[d.x,d.y,d.z].every(Number.isFinite))deposit(d);
  function rebuild(cx,cz,step=.32){
    const k=cx+','+cz,old=chunks.get(k);if(old){old.geometry.dispose();old.removeFromParent();chunks.delete(k);}
    const data=PitfallTerrainMesh.build(field,cx,cz,step);if(!data.length)return;
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data,3));geo.computeVertexNormals();geo.computeBoundingSphere();
    // Use mesh normals; avoid six additional density samples for every output vertex.
    const m=new T.Mesh(geo,material);m.receiveShadow=true;m.castShadow=true;m.userData.interaction={kind:'rock'};group.add(m);chunks.set(k,m);
  }
  // Build only chunks intersecting the original cliff, the room, or saved cuts.
  const initial=new Set(),mark=(cx,cz)=>initial.add(cx+','+cz);
  for(let z=world.Z_MIN;z<=world.Z_MAX;z+=4){const b=world.bounds(z);for(let x=Math.floor(b.left/4)-1;x<=Math.ceil(b.right/4)+1;x++)mark(x,Math.floor(z/4));}
  for(let cz=Math.floor(world.Z_MIN/4);cz<Math.ceil(world.Z_MAX/4);cz++)for(const side of ['left','right']){
    const a=world.bounds(cz*4)[side],b=world.bounds(cz*4+4)[side];for(let cx=Math.floor(Math.min(a,b)/4)-1;cx<=Math.floor(Math.max(a,b)/4)+1;cx++)mark(cx,cz);
  }
  for(const z of [world.Z_MIN,world.Z_MAX]){const b=world.bounds(z);for(let cx=Math.floor(b.left/4)-1;cx<=Math.floor(b.right/4)+1;cx++)for(let cz=Math.floor(z/4)-1;cz<=Math.floor(z/4);cz++)mark(cx,cz);}
  for(let cx=Math.floor((chamber.x-6)/4);cx<=Math.floor((chamber.x+6)/4);cx++)for(let cz=Math.floor((chamber.z-6)/4);cz<=Math.floor((chamber.z+6)/4);cz++)mark(cx,cz);
  for(const c of field.cuts)for(let cx=Math.floor((c.x-c.r-.1)/4);cx<=Math.floor((c.x+c.r+.1)/4);cx++)for(let cz=Math.floor((c.z-c.r-.1)/4);cz<=Math.floor((c.z+c.r+.1)/4);cz++)mark(cx,cz);
  const refined=new Set();for(const c of field.cuts)for(let cx=Math.floor((c.x-c.r-.1)/4);cx<=Math.floor((c.x+c.r+.1)/4);cx++)for(let cz=Math.floor((c.z-c.r-.1)/4);cz<=Math.floor((c.z+c.r+.1)/4);cz++)refined.add(cx+','+cz);
  for(const k of initial)rebuild(...k.split(',').map(Number),refined.has(k)?.25:.5);
  const {x:mx,z:mz}=chamber;
  for(const x of [mx-3,mx,mx+3]){for(const z of [mz-3.4,mz+3.4]){box(x,1.8,z,.22,3.6,.22,wood);world.box(x,z,.22,.22);}box(x,3.6,mz,.25,.25,7,wood);segment([x,2.9,mz-3.4],[x,3.6,mz-2.5],.09,wood);}
  for(let x=mx-4;x<mx+4;x+=.8)box(x,.07,mz,.13,.14,1.6,wood);
  for(const z of [mz-.5,mz+.5])box(mx,.15,z,8,.1,.06,iron);
  model('box-large',mx+1,0,mz+2,1);world.box(mx+1,mz+2,1.2,1.2);
  for(const x of [mx-2,mx+2]){const l=new T.PointLight(0xffb673,13,9,2);l.position.set(x,2.9,mz);scene.add(l);box(x,3,mz,.18,.22,.18,mat(0xffd49b,{emissive:0xffb36c,emissiveIntensity:1}));}
  for(let i=0;i<9;i++){
    const angle=i*Math.PI*2/9,id='vein-'+i,gem=Object.keys(colors)[i%3],g=new T.Group();g.position.set(mx+Math.cos(angle)*5.15,1.5,mz+Math.sin(angle)*5.15);g.userData.interaction={kind:'vein',id,gem};scene.add(g);
    for(let n=0;n<3;n++){const m=new T.Mesh(new T.OctahedronGeometry(.18+n*.025),mat(colors[gem],{emissive:colors[gem],emissiveIntensity:.25,roughness:.3}));m.position.set(Math.sin(angle)*(n-1)*.25,n*.25,Math.cos(angle)*(n-1)*.25);m.scale.y=1.4;g.add(m);}
    if((field.state.veins[id]||0)>=3){g.visible=false;g.removeFromParent();}veins.push({id,gem,g});
  }
  function burst(at,color=0xc8a078,n=10){for(let i=0;i<n;i++){const m=new T.Mesh(chipGeo,new T.MeshBasicMaterial({color}));m.position.copy(at);m.raycast=()=>{};effects.add(m);particles.push({m,life:.6+Math.random()*.3,v:new T.Vector3((Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2)});}shake=.025;}
  function strike(hit,p,tool){
    if(!hit.point)return null;burst(hit.point,tool?.radius===1.2?0xd9f6ff:hit.gem?colors[hit.gem]:undefined);if(tool?.radius===1.2){impactLight.position.copy(hit.point);impactLight.intensity=12;}
    if(hit.kind==='vein'){
      if(!PitfallInventory.canMine(tool,hit.gem))return {warning:PitfallInventory.ITEMS[PitfallInventory.ORE_REQUIREMENTS[hit.gem]]?.name+' 이상이 필요합니다. 광석은 손상되지 않았습니다.'};
      const v=veins.find(v=>v.id===hit.id);if(!v||!v.g.visible)return null;
      const n=field.state.veins[v.id]=Math.min(3,(field.state.veins[v.id]||0)+(tool?.damage||1));v.g.scale.setScalar(1-n*.12);
      if(n>=3){v.g.visible=false;v.g.removeFromParent();return {loot:[v.gem]};}return {};
    }
    const normal=hit.normal||new T.Vector3(p.x-hit.point.x,0,p.z-hit.point.z).normalize();
    if(tool?.drill&&normal.y<.5)return {warning:'드릴은 바닥을 향해 사용하세요. 좌클릭을 꾹 누르면 발아래를 연속 굴착합니다.'};
    const floorY=Math.min(0,Number.isFinite(p.airY)?p.airY:0);
    // Upward-facing rock above the player's floor is a removable bump, not the floor.
    if(!tool?.drill&&normal.y>.5&&hit.point.y<=floorY+.04)return {warning:'발밑 바닥은 드릴로 파세요. 위로 튀어나온 돌은 곡괭이로 깎을 수 있습니다.'};
    const result=field.strike(hit.point,normal,tool?.radius,!!tool?.drill,p.airY);
    if(!result)return {warning:'조금 다른 지점을 겨냥해 깎으세요.'};
    if(result.roof){stress++;lastHit=performance.now();if(stress>=12&&!pending)pending={time:2,at:hit.point.clone()};return {warning:stress>=12?'천장이 무너집니다! 뒤로 물러나세요.':stress>=5?'천장이 갈라집니다. 위쪽을 더 파면 위험합니다.':'위쪽 암반에서 돌가루가 떨어집니다.'};}
    const cleanup=field.cleanup(hit.point),dirty=new Set([...result.dirty,...cleanup.dirty].map(v=>v.join(',')));
    for(const k of dirty)rebuild(...k.split(',').map(Number));
    if(cleanup.removed)burst(hit.point,0xc8a078,16);
    const n=field.state.totalCuts,loot=[];if(n%6===0)loot.push('stone');if(n%43===0)loot.push('stick');
    let warning;const at=hit.point,b=world.bounds(at.z),buried=at.x<b.left-1.5||at.x>b.right+1.5||at.z<world.Z_MIN-1.5||at.z>world.Z_MAX+1.5;
    if(!tool?.drill&&normal.y<.5&&buried&&Math.hypot(at.x-mx,at.z-mz)>6&&[[1.4,0],[-1.4,0],[0,1.4],[0,-1.4]].every(([dx,dz])=>field.density(at.x+dx,p.airY+1.2,at.z+dz)<0)){
      stress++;lastHit=performance.now();if(stress>=5)warning='지지대 없이 너무 넓게 파고 있습니다. 천장이 불안정합니다.';
      if(stress>=12&&!pending){pending={time:2,at:at.clone()};warning='넓어진 굴의 천장이 무너집니다! 뒤로 물러나세요.';}
    }
    return {loot,warning};
  }
  let cleanClock=0,lastCleanCount=-1;const checked=new Map();
  function update(dt,p){
    for(const v of veins){if(!v.g.parent)continue;const q=v.g.position;if(Math.hypot(q.x-p.x,q.z-p.z)>30)continue;const supported=[[.32,0,0],[-.32,0,0],[0,.32,0],[0,-.32,0],[0,0,.32],[0,0,-.32]].some(([x,y,z])=>field.density(q.x+x,q.y+y,q.z+z)>.01);if(!supported){v.vy=(v.vy||0)-9*dt;const next=q.y+v.vy*dt;if(field.density(q.x,next-.18,q.z)<0){q.y=next;const d=deposits.find(d=>d.id===v.id);if(d)d.y=next;}else v.vy=0;}else v.vy=0;}
    impactLight.intensity=Math.max(0,impactLight.intensity-dt*50);
    cleanClock+=dt;
    if(cleanClock>2){cleanClock=0;const k=Math.round(p.x*2)+','+Math.round(p.z*2);if(lastCleanCount!==field.count&&checked.get(k)!==field.count){lastCleanCount=field.count;checked.set(k,field.count);
      const near=field.cuts.filter(c=>Math.hypot(c.x-p.x,c.z-p.z)<2.8);if(near.length){const at=new T.Vector3(p.x-Math.sin(p.yaw)*1.4,1.25,p.z-Math.cos(p.yaw)*1.4),r=field.cleanup(at);for(const [x,z] of r.dirty)rebuild(x,z);if(r.removed){burst(at);try{localStorage.setItem('pitfall-terrain-v2',field.serialize());}catch{}}}
    }}
    const b=world.bounds(p.z),inside=p.x<b.left||p.x>b.right||p.z<world.Z_MIN||p.z>world.Z_MAX;lantern.position.set(p.x,2.5+p.airY,p.z);lantern.intensity=inside?16:0;shake=Math.max(0,shake-dt*.2);
    if(performance.now()-lastHit>10000)stress=Math.max(0,stress-dt*.3);
    for(let i=particles.length-1;i>=0;i--){const a=particles[i];a.life-=dt;a.v.y-=5*dt;a.m.position.addScaledVector(a.v,dt);a.m.scale.setScalar(Math.max(.05,a.life));if(a.life<=0){a.m.removeFromParent();a.m.material.dispose();particles.splice(i,1);}}
    if(pending){pending.time-=dt;if(pending.time<=0){const at=pending.at;pending=null;const removed=field.collapse(at),dirty=new Set();for(const c of removed)for(let cx=Math.floor((c.x-c.r-.1)/4);cx<=Math.floor((c.x+c.r+.1)/4);cx++)for(let cz=Math.floor((c.z-c.r-.1)/4);cz<=Math.floor((c.z+c.r+.1)/4);cz++)dirty.add(cx+','+cz);for(const k of dirty)rebuild(...k.split(',').map(Number));burst(at,0xb39a7a,40);shake=.12;stress=0;
      if(!world.free(p.x,p.z)||Math.hypot(p.x-at.x,p.z-at.z)<2){p.z=Math.max(world.Z_MIN+3,Math.min(world.Z_MAX-3,p.z));const b=world.bounds(p.z);p.x=(b.left+b.right)/2;p.airY=0;p.vy=0;return 'collapse-hit';}return 'collapse';}}
    if(!field.state.discovered&&Math.hypot(p.x-mx,p.z-mz)<4.8){field.state.discovered=true;return 'discovery';}
    return null;
  }
  function drawMap(ctx,X,Z,s){ctx.fillStyle='#51473b';for(const c of field.cuts){ctx.beginPath();ctx.arc(X(c.x),Z(c.z),Math.max(1,c.r*s),0,Math.PI*2);ctx.fill();}if(field.state.discovered){ctx.beginPath();ctx.arc(X(mx),Z(mz),5.5*s,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f3d7a7';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('발견한 폐광',X(mx),Z(mz));}}
  const zone=p=>Math.hypot(p.x-mx,p.z-mz)<5.5?'발견한 폐광':p.x<world.bounds(p.z).left||p.x>world.bounds(p.z).right||p.z<world.Z_MIN||p.z>world.Z_MAX?'직접 판 땅굴':null;
  return {dig:field,legacyMigration,strike,update,drawMap,zone,get shake(){return shake;},get pending(){return !!pending;},summary:()=>({cuts:field.count,discovered:field.state.discovered,collapses:field.state.collapses}),diagnostics:()=>({chamber:{...chamber},cuts:field.cuts,stress,chunks:chunks.size})};
};


