window.buildEquipment=function({T,scene,world,p,bag,stamina,model,save,renderBag,toast,icon,setPaused}){
  const I=PitfallInventory,key='pitfall-equipment-v1';let raw={};try{raw=JSON.parse(localStorage.getItem(key))||{};}catch{}
  function slots(value,n){return Array.from({length:n},(_,i)=>{const v=value?.[i];return v&&I.ITEMS[v.id]&&Number.isInteger(v.count)&&v.count>0&&v.count<=I.ITEMS[v.id].max?{id:v.id,count:v.count}:null;});}
  const state={boots:raw.boots===true,chest:slots(raw.chest,12),pack:slots(raw.pack,6),worn:raw.worn!==false,x:Number.isFinite(raw.x)?raw.x:-7,y:Number.isFinite(raw.y)?raw.y:0,z:Number.isFinite(raw.z)?raw.z:10};
  let usedJump=false,opened=null;
  const pack=new T.Group();scene.add(pack);pack.userData.interaction={kind:'pack'};
  const cloth=new T.MeshStandardMaterial({color:0xb87939,roughness:1}),strap=new T.MeshStandardMaterial({color:0x284740});
  function part(x,y,z,w,h,d,material){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);pack.add(m);}
  part(0,.38,0,.55,.7,.3,cloth);part(0,.25,.2,.42,.28,.15,cloth);for(const x of [-.18,.18])part(x,.42,.18,.05,.62,.04,strap);
  const chest=model('chest',-4.9,.08,6.9,.65,-Math.PI/2);chest.userData.interaction={kind:'storage'};
  const status=document.createElement('div');status.className='equipment-status';document.body.append(status);
  const overlay=document.createElement('section');overlay.className='craft-overlay';overlay.hidden=true;overlay.innerHTML='<div class="craft-dialog" role="dialog" aria-modal="true" aria-label="보관함"><div class="craft-heading"><h2></h2><button class="craft-close">닫기</button></div><p>아이템을 클릭하면 묶음 전체가 반대쪽으로 이동합니다.</p><h3>손에 든 물건 · 3칸</h3><div class="storage-hand recipe-grid"></div><h3 class="storage-label"></h3><div class="storage-slots recipe-grid"></div><p class="storage-message" role="status"></p><button class="craft-button wear-pack">배낭 다시 착용</button></div>';document.body.append(overlay);
  function persist(){try{localStorage.setItem(key,JSON.stringify(state));save();}catch{toast('장비 저장에 실패했습니다.');}sync();}
  function sync(){pack.position.set(state.x,state.y+.05,state.z);if(state.worn)pack.removeFromParent();else if(!pack.parent)scene.add(pack);status.textContent='4 · 배낭 '+(state.worn?'착용 중':'바닥에 놓음')+'  |  중력부츠 '+(state.boots?'장착':'미장착');}
  function close(){opened=null;overlay.hidden=true;setPaused(false);}
  function draw(){const target=state[opened];overlay.querySelector('h2').textContent=opened==='pack'?'탐사 배낭':'기지 보관 상자';overlay.querySelector('.storage-label').textContent=opened==='pack'?'배낭 · 6칸':'상자 · 12칸';overlay.querySelector('.wear-pack').hidden=opened!=='pack';
    for(const [selector,source,dest] of [['.storage-hand',bag.slots,target],['.storage-slots',target,bag.slots]]){const grid=overlay.querySelector(selector);grid.replaceChildren();source.forEach((item,i)=>{const b=document.createElement('button');b.className='recipe-card storage-item';b.disabled=!item;const label=item?I.ITEMS[item.id].name+' × '+item.count:'빈 칸';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=item?icon(item.id)+'<span class="storage-count">'+item.count+'</span>':'<span aria-hidden="true">—</span>';b.onclick=()=>{if(!I.transfer(source,dest,i))overlay.querySelector('.storage-message').textContent='옮길 공간이 부족합니다.';else{persist();renderBag();draw();}};grid.append(b);});}}
  overlay.querySelector('.craft-close').onclick=close;overlay.querySelector('.wear-pack').onclick=()=>{state.worn=true;persist();close();};
  overlay.addEventListener('keydown',e=>{if(e.code==='Escape'){e.stopPropagation();close();}if(e.code==='Tab'){const buttons=[...overlay.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden),i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}});
  function open(kind){if(p.airY>0)return;opened=kind==='pack'?'pack':'chest';overlay.querySelector('.storage-message').textContent='';setPaused(true);overlay.hidden=false;draw();overlay.querySelector('.craft-close').focus();}
  function dropPack(){if(!state.worn)return toast('바닥에 놓은 배낭을 클릭해 다시 착용하세요.');if(world.density?!p.grounded:p.airY>0)return toast('착지한 뒤 배낭을 벗으세요.');const dir=world.direction(p.yaw,1,0);let position=null;
    for(const distance of [1.2,.8,.4,.2,0]){const x=p.x+dir.x*distance,z=p.z+dir.z*distance,y=p.airY||0;if(world.free(x,z,.3,y)){position={x,y,z};break;}}
    if(!position)return toast('앞에 배낭을 놓을 공간이 필요합니다.');state.worn=false;Object.assign(state,position);persist();toast('배낭을 클릭해 물건을 넣거나 다시 착용하세요.');}
  function rightClick(){const slot=bag.slots[bag.selected];if(slot?.id==='boots'&&!state.boots){state.boots=true;bag.slots[bag.selected]=null;toast('중력부츠 장착 · 공중에서 SPACE로 한 번 더 점프');}else if(!slot&&state.boots){bag.slots[bag.selected]={id:'boots',count:1};state.boots=false;toast('중력부츠 해제');}else return;persist();renderBag();}
  function jump(){if(p.grounded||(!world.density&&p.airY===0)){usedJump=false;return world.jump(p,stamina);}if(!state.boots||usedJump||stamina.value<4.5||stamina.exhausted||!world.free(p.x,p.z,world.RADIUS,p.airY+1.2))return false;usedJump=true;p.vy=6.6;p.jumping=true;stamina.value-=4.5;stamina.delay=.5;return true;}
  sync();return {open,dropPack,rightClick,jump,get opened(){return !!opened;},state};
};
