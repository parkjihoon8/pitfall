window.buildExploration=function({T,scene,camera,p,bag,world,excavation,save,renderBag,toast,giveLoot}){
  let state={placed:[],harvested:[],headlamp:false};try{Object.assign(state,JSON.parse(localStorage.getItem('pitfall-exploration-v1'))||{});}catch{}
  if(!state.headlampEquipped)state.headlamp=false;
  const gear=document.createElement('div');gear.style.cssText='position:fixed;right:24px;top:110px;color:#e3faff;font:14px sans-serif;pointer-events:none';document.body.append(gear);
  const ladders=[],lights=[],flora=new Map(),wood=new T.MeshStandardMaterial({color:0x795239}),metal=new T.MeshStandardMaterial({color:0x688b87});
  const lamp=new T.SpotLight(0xe0f5ff,0,22,.55,.5,1.5);scene.add(lamp,lamp.target);
  const signal=document.createElement('div');signal.className='scanner-signal';document.body.append(signal);
  function persist(){localStorage.setItem('pitfall-exploration-v1',JSON.stringify(state));save();}
  function rod(group,a,b,r,material){const d=new T.Vector3().subVectors(b,a),m=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),5),material);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());group.add(m);}
  function placed(d){const g=new T.Group();g.position.set(d.x,d.y,d.z);g.rotation.y=d.yaw||0;scene.add(g);if(d.id==='ladder'){for(const x of [-.35,.35])rod(g,new T.Vector3(x,0,0),new T.Vector3(x,2.5,0),.045,wood);for(let y=.2;y<2.5;y+=.3)rod(g,new T.Vector3(-.35,y,0),new T.Vector3(.35,y,0),.035,wood);ladders.push(d);}else{rod(g,new T.Vector3(),new T.Vector3(0,.6,0),.05,wood);const flame=new T.Mesh(new T.OctahedronGeometry(.14),new T.MeshBasicMaterial({color:0xffb05c}));flame.position.y=.65;g.add(flame);const l=new T.PointLight(0xffbd78,15,12,2);l.position.y=.8;g.add(l);lights.push(l);}g.userData.interaction={kind:'placed',item:d.id};}
  for(const d of state.placed)if(['ladder','torch'].includes(d.id)&&[d.x,d.y,d.z].every(Number.isFinite))placed(d);
  function bush(x,y,z,id){if(state.harvested.includes(id))return;const g=new T.Group();g.position.set(x,y,z);g.userData.interaction={kind:'flora',id};for(let i=0;i<7;i++){const a=i*2.4,b=new T.Vector3(Math.cos(a)*.55,.4+(i%3)*.2,Math.sin(a)*.55);rod(g,new T.Vector3(),b,.035,wood);rod(g,b,b.clone().add(new T.Vector3(.1,.25,-.1)),.018,wood);}scene.add(g);flora.set(id,g);}
  for(let z=-12,i=0;z>world.Z_MIN+10;z-=17,i++){const b=world.bounds(z);bush(i%2?b.left+2:b.right-2,0,z,'thorn-'+i);}const c=excavation.dig.chamber;for(let i=0;i<4;i++)bush(c.x-2+i,0,c.z+3,'root-'+i);
  function harvest(id){const g=flora.get(id);if(!g)return;g.removeFromParent();flora.delete(id);state.harvested.push(id);giveLoot('stick');persist();}
  function use(hit){const slot=bag.slots[bag.selected];if(!slot){if(state.headlampEquipped){bag.slots[bag.selected]={id:'headlamp',count:1};state.headlampEquipped=false;state.headlamp=false;persist();renderBag();toast('헤드램프를 벗었습니다.');return true;}return false;}
    if(slot.id==='headlamp'){if(state.headlampEquipped){toast('이미 헤드램프를 쓰고 있습니다.');return true;}bag.slots[bag.selected]=null;state.headlampEquipped=true;state.headlamp=true;toast('헤드램프 착용 · 맨손 우클릭으로 벗기');persist();renderBag();return true;}
    if(!['ladder','torch'].includes(slot.id))return false;
    if(!hit||!['rock','roof'].includes(hit.kind)){toast('가까운 암벽이나 땅을 겨냥하세요.');return true;}
    const v=hit.point;if(slot.id==='ladder'&&(v.y>0||Math.abs(hit.normal.y)>.5)){toast('사다리는 지하 수직 벽면에만 설치할 수 있습니다.');return true;}
    const y=slot.id==='ladder'?Math.min(-2.5,v.y-1):v.y;if(v.y>3.4){toast('보호 구역에는 설치할 수 없습니다.');return true;}
    const d={id:slot.id,x:v.x+hit.normal.x*.2,y,z:v.z+hit.normal.z*.2,yaw:Math.atan2(hit.normal.x,hit.normal.z)};state.placed.push(d);placed(d);if(--slot.count===0)bag.slots[bag.selected]=null;persist();renderBag();toast('설치 완료 · 사다리 가까이에서 W/S로 오르내리기');return true;
  }
  let attached=null;
  const near=d=>Math.hypot(d.x-p.x,d.z-p.z)<1.45&&p.airY>=d.y-.4&&p.airY<=d.y+2.7;
  function ladderNear(){return ladders.filter(near).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];}
  function release(keys){return keys.has('KeyA')||keys.has('KeyD')||keys.has('Space');}
  function climbing(keys){if(release(keys))return false;const l=ladderNear();return !!l&&((keys.has('KeyW')&&p.airY<Math.min(0,l.y+2.6)-.01)||(keys.has('KeyS')&&p.airY>l.y+.01));}
  function update(dt,keys){lamp.intensity=state.headlampEquipped?22:0;gear.textContent=state.headlampEquipped?'☀ 헤드램프 착용':'';lamp.position.copy(camera.position);lamp.target.position.copy(camera.position).add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(10));
    const held=bag.slots[bag.selected]?.id;signal.hidden=held!=='scanner';if(held==='scanner'){
      const distance=t=>Math.hypot(t.x-p.x,t.y-(p.airY+1),t.z-p.z),bearing=t=>(Math.atan2(t.x-p.x,-(t.z-p.z))*180/Math.PI+360)%360,c=excavation.dig.chamber;
      const targets=(excavation.dig.state.deposits||[]).filter(d=>(excavation.dig.state.veins[d.id]||0)<3&&distance(d)<=10).sort((a,b)=>distance(a)-distance(b)),ore=targets.find(t=>t.gem!=='diamond'),diamond=targets.find(t=>t.gem==='diamond');
      const mineDistance=distance({x:c.x,y:1.5,z:c.z}),mine=mineDistance<=50,relative=(bearing(c)+(p.yaw||0)*180/Math.PI+720)%360,arrow=['↑','↗','→','↘','↓','↙','←','↖'][Math.round(relative/45)%8];
      const line=t=>PitfallInventory.ITEMS[t.gem].name+' · '+distance(t).toFixed(1)+'m · 방위 '+Math.round(bearing(t))+'°';
      signal.style.fontSize=mine?'23px':'16px';signal.style.whiteSpace='pre-line';signal.textContent=(mine?'⚠ 폐광 '+arrow+' · '+mineDistance.toFixed(1)+'m · 방위 '+Math.round(bearing(c))+'°\n':'')+(ore?'광맥 신호 · '+line(ore):'10m 이내 일반 광맥 신호 없음')+'\n'+(diamond?'◆ 다이아 전용 신호 · '+line(diamond):'◆ 10m 이내 다이아 신호 없음');
    }
    if(release(keys)){attached=null;return false;}
    if(attached&&!near(attached))attached=null;
    const direction=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
    if(direction){const candidates=ladders.filter(near).filter(d=>direction>0?Math.min(0,d.y+2.6)>p.airY+.01:d.y<p.airY-.01);attached=candidates.sort((a,b)=>direction>0?b.y-a.y:a.y-b.y)[0]||attached||ladderNear();}
    if(!attached)return false;
    const next=Math.min(0,attached.y+2.6,Math.max(attached.y,p.airY+direction*dt*2.2)),radius=world.RADIUS||.3;
    if(world.free(p.x,p.z,radius,next))p.airY=next;
    else if(direction){
      // Find a nearby clear lane without passing through rock on the way there.
      let moved=false;for(const reach of [.06,.12,.18,.24]){for(let i=0;i<8;i++){const dx=Math.cos(i*Math.PI/4)*reach,dz=Math.sin(i*Math.PI/4)*reach;let clear=true;for(let t=.25;t<=1;t+=.25)if(!world.free(p.x+dx*t,p.z+dz*t,radius,p.airY)||!world.free(p.x+dx*t,p.z+dz*t,radius,next)){clear=false;break;}if(clear){p.x+=dx;p.z+=dz;p.airY=next;moved=true;break;}}if(moved)break;}
    }
    p.vy=0;p.landingSpeed=0;p.jumping=false;p.grounded=false;return true;
  }
  return {use,harvest,update,ladderNear,climbing};
};
