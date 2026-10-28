window.buildVitals=function({p,stamina,toast}){
  let hp=100;try{const value=JSON.parse(localStorage.getItem('pitfall-health-v1'));if(Number.isFinite(value))hp=Math.max(1,Math.min(100,value));}catch{}
  const panel=document.createElement('div');panel.className='health-panel';panel.innerHTML='<div>체력 <span></span></div><div class="health-track"><div></div></div>';document.body.append(panel);
  const fade=document.createElement('div');fade.className='rest-fade';document.body.append(fade);let resting=false;
  function save(){try{localStorage.setItem('pitfall-health-v1',JSON.stringify(hp));}catch{}}
  function draw(){panel.querySelector('span').textContent=Math.ceil(hp)+' / 100';panel.querySelector('.health-track div').style.width=hp+'%';}
  function recover(){hp=100;stamina.value=100;stamina.exhausted=false;stamina.delay=0;save();draw();}
  function respawn(){p.x=-9.5;p.z=7.7;p.airY=0;p.vy=0;p.viewY=0;p.jumping=false;p.grounded=true;recover();toast('기지 침낭에서 깨어났습니다.');}
  function damage(amount){if(resting||amount<=0)return;hp=Math.max(0,hp-amount);if(hp===0)respawn();else{save();draw();toast('체력 -'+Math.round(amount));}}
  function sleep(){if(resting)return;resting=true;fade.classList.add('dark');setTimeout(()=>{recover();setTimeout(()=>{fade.classList.remove('dark');resting=false;toast('휴식 완료 · 체력과 스태미나 회복');},250);},650);}
  draw();return {damage,sleep,respawn,get resting(){return resting;},get hp(){return hp;}};
};
