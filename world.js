(function(root){
  'use strict';
  const Z_MIN=-264, Z_MAX=36, STEP=4, RADIUS=.3;
  const slices=[];
  for(let z=Z_MIN;z<=Z_MAX;z+=STEP){
    const center=4*Math.sin(z*.046)+2*Math.sin(z*.103);
    const half=16+2.2*Math.sin(z*.063)+1.1*Math.cos(z*.17);
    slices.push({z,left:center-half,right:center+half});
  }
  const obstacles=[];let underground=null;
  function setUnderground(test){underground=test;}
  function bounds(z){
    const n=Math.max(0,Math.min(slices.length-2,Math.floor((z-Z_MIN)/STEP)));
    const t=Math.max(0,Math.min(1,(z-slices[n].z)/STEP));
    const a=slices[n],b=slices[n+1];
    return {left:a.left+(b.left-a.left)*t,right:a.right+(b.right-a.right)*t};
  }
  function box(x,z,w,d){obstacles.push({kind:'box',x,z,w,d});}
  function circle(x,z,r){obstacles.push({kind:'circle',x,z,r});}
  function free(x,z,r=RADIUS,airY=0){
    if(!Number.isFinite(x)||!Number.isFinite(z))return false;
    const inTunnel=underground&&underground(x,z,r,airY);
    if(airY<-.05&&!inTunnel)return false;
    if((z-r<=Z_MIN||z+r>=Z_MAX)&&!inTunnel)return false;
    // Check the entire player's footprint, including curved wall corners.
    for(const dz of inTunnel?[]:[-r,0,r]){
      const b=bounds(z+dz);if(x-r<=b.left||x+r>=b.right)return false;
    }
    return !obstacles.some(o=>{
      if(o.kind==='circle')return Math.hypot(x-o.x,z-o.z)<r+o.r;
      const dx=x-Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2));
      const dz=z-Math.max(o.z-o.d/2,Math.min(z,o.z+o.d/2));
      return dx*dx+dz*dz<r*r;
    });
  }
  function move(p,dx,dz){
    // Substeps prevent tunnelling even during a slow frame or a long input.
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
    for(let i=0;i<steps;i++){
      for(const [sx,sz] of [[dx/steps,0],[0,dz/steps]]){if(!sx&&!sz)continue;const x=p.x+sx,z=p.z+sz,y=p.airY||0;
        const footClear=!p.grounded||!api.density||[[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]].every(([ax,az])=>api.density(x+ax,y+.03,z+az)<=0);
        if(free(x,z,RADIUS,y)&&footClear){p.x=x;p.z=z;}
        else if(p.grounded&&api.density){
          // Search the lowest clearance instead of getting stuck when one fixed step fails.
          for(let lift=.05;lift<=.551;lift+=.05){if(!free(p.x,p.z,RADIUS,y+lift)||!free(x,z,RADIUS,y+lift))continue;
            if([[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]].some(([ax,az])=>api.density(x+ax,y+lift+.01,z+az)>0))continue;
            let ceiling=false;for(let h=.1;h<=lift+.01;h+=.1)if(api.density(p.x,y+1.8+h,p.z)>0||api.density(x,y+1.8+h,z)>0){ceiling=true;break;}if(ceiling)continue;
            p.x=x;p.z=z;p.airY=y+lift;p.vy=0;p.stepOffset=(p.stepOffset||0)-lift;p.grounded=false;break;
          }
        }
      }
    }
    return p;
  }
  function direction(yaw,forward,right){
    const len=Math.hypot(forward,right)||1;
    return {x:(-Math.sin(yaw)*forward+Math.cos(yaw)*right)/len,
      z:(-Math.cos(yaw)*forward-Math.sin(yaw)*right)/len};
  }
  function staminaState(){return {value:100,delay:0,exhausted:false};}
  function jump(p,s){
    if((api.density?!p.grounded:p.airY>0)||s.value<4.5||s.exhausted||!free(p.x,p.z,RADIUS,p.airY+1.2))return false;
    s.value-=4.5;s.delay=.5;if(s.value<=0)s.exhausted=true;p.vy=6.6;p.airY+=.001;p.grounded=false;return true;
  }
  function gravity(p,dt){
    if(api.density){p.landingSpeed=0;p.vy-=18*dt;const travel=p.vy*dt,steps=Math.max(1,Math.ceil(Math.abs(travel)/.06));p.grounded=false;
      for(let i=0;i<steps;i++){const y=p.airY+travel/steps;let blocked=false;for(const [dx,dz] of [[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]])if(api.density(p.x+dx,y+(travel<0?0:1.8),p.z+dz)>0)blocked=true;
        if(blocked){if(travel<0){p.grounded=true;p.landingSpeed=p.vy;if(p.airY>=0&&p.airY<.1&&api.density(p.x,0,p.z)===0)p.airY=0;}p.vy=0;break;}p.airY=y;}return;}
    if(p.airY>0){p.vy-=18*dt;p.airY=Math.max(0,p.airY+p.vy*dt);if(p.airY===0)p.vy=0;}
  }
  function canSprint(s,requested){return requested&&!s.exhausted&&s.value>0;}
  function updateStamina(s,dt,sprinting,requested){
    if(sprinting){s.value=Math.max(0,s.value-5*dt);s.delay=.5;if(s.value===0)s.exhausted=true;}
    else {const recovery=Math.max(0,dt-s.delay);s.delay=Math.max(0,s.delay-dt);s.value=Math.min(100,s.value+16*recovery);}
    if(s.exhausted&&s.value>=25&&!requested)s.exhausted=false;
    return s;
  }
  const api={slices,bounds,obstacles,box,circle,free,move,direction,staminaState,canSprint,updateStamina,jump,gravity,setUnderground,RADIUS,Z_MIN,Z_MAX};
  root.PitfallWorld=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
