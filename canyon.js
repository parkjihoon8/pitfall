/* Pitfall: first-person canyon study. Kenney CC0 meshes, locally bundled Three.js. */
(() => {
  'use strict';
  const menu=document.getElementById('menu'), message=document.getElementById('message');
  try {
    if(!window.THREE||!window.PITFALL_ASSETS)throw new Error('게임 파일이 누락되었습니다. 같은 폴더의 엔진·에셋 파일을 확인해 주세요.');
    const T=THREE, world=PitfallWorld, scene=new T.Scene();
    const sky=0xb4d5cb;
    scene.background=new T.Color(sky);scene.fog=new T.Fog(sky,65,195);
    const camera=new T.PerspectiveCamera(76,innerWidth/innerHeight,.08,300);
    const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    const canvas=renderer.domElement;canvas.id='world';canvas.tabIndex=0;canvas.setAttribute('aria-label','주황색 절벽과 간이 기지가 있는 1인칭 협곡');
    document.body.prepend(canvas);
    scene.add(new T.HemisphereLight(0xd9f1e6,0xb16e45,2.2));
    const sunlight=new T.DirectionalLight(0xffedcf,3.1);
    sunlight.position.set(-32,65,18);sunlight.target.position.set(0,0,-18);scene.add(sunlight,sunlight.target);
    sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);
    Object.assign(sunlight.shadow.camera,{left:-55,right:55,top:72,bottom:-50,near:1,far:180});
    sunlight.shadow.bias=-.0004;sunlight.shadow.normalBias=.16;scene.add(sunlight);
    const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.95,flatShading:true,...extra});
    const cream=mat(0xd3d2b6),metal=mat(0x395957),dark=mat(0x293e3b),orange=mat(0xc55c32),glass=mat(0x578c93,{metalness:.35,roughness:.28});
    const sand=mat(0xdca16a),warm=mat(0xe9bd79),green=mat(0x68836e);
    let seed=937;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    const range=(a,b)=>a+(b-a)*rand();
    function mesh(geo,material,x,y,z,parent=scene){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
    function box(x,y,z,w,h,d,material,parent=scene){return mesh(new T.BoxGeometry(w,h,d),material,x,y,z,parent);}
    function cylinder(x,y,z,r,h,material,parent=scene){return mesh(new T.CylinderGeometry(r,r,h,8),material,x,y,z,parent);}
    function segment(a,b,r,material){const v=new T.Vector3(...b).sub(new T.Vector3(...a));const m=cylinder((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,v.length(),material);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
    const palette=new T.TextureLoader().load(window.PITFALL_PALETTE);palette.colorSpace=T.SRGBColorSpace;palette.magFilter=T.NearestFilter;
    const modelCache={};
    for(const [name,data] of Object.entries(PITFALL_ASSETS)){
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
      geo.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));
      const colors=data.colors.slice();for(let i=0;i<colors.length;i+=3){const c=new T.Color().setRGB(colors[i],colors[i+1],colors[i+2],T.SRGBColorSpace);colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
      geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();geo.computeBoundingBox();
      const size=new T.Vector3();geo.boundingBox.getSize(size);
      geo.translate(-(geo.boundingBox.min.x+geo.boundingBox.max.x)/2,-geo.boundingBox.min.y,-(geo.boundingBox.min.z+geo.boundingBox.max.z)/2);
      const material=mat(0xffffff,{vertexColors:true,side:T.DoubleSide,map:data.pack==='survival'?palette:null});
      modelCache[name]={geo,material,size};
    }
    function model(name,x,y,z,height,rotation=0,material=null){
      const a=modelCache[name];const m=mesh(a.geo,material||a.material,x,y,z);m.scale.setScalar(height/a.size.y);m.rotation.y=rotation;return m;
    }
    function rock(name,x,y,z,w,h,d,material){const a=modelCache[name];const m=mesh(a.geo,material,x,y,z);m.scale.set(w/a.size.x,h/a.size.y,d/a.size.z);m.rotation.y=range(-.25,.25);return m;}
    // Continuous terraced canyon walls: the bottom edge is shared with collision.
    const levels=[0,4.5,11,20,32,47,61];
    const strata=[0xbd6945,0xd7854f,0xe39a5c,0xc4754b,0xe7a568,0xd9905d];
    function wall(side){
      const grid=world.slices.map(({z,left,right},i)=>levels.map((y,j)=>{
        const spread=[0,.6,1.4,3.5,5.5,8,12][j];
        return [(side<0?left:right)+side*(j<=1?0:spread+Math.sin(i*1.9+j)*.65),y+(j<=1?0:Math.sin(i*.71+j*1.8)*Math.min(j,.9)*2),z];
      }));
      const positions=[],colors=[];
      function triangle(a,b,c,color){positions.push(...a,...b,...c);for(let n=0;n<3;n++)colors.push(color.r,color.g,color.b);}
      for(let i=0;i<grid.length-1;i++)for(let j=0;j<levels.length-1;j++){
        if(j===0)continue;
        const color=new T.Color(strata[j]);color.multiplyScalar(range(.87,1.07));
        const a=grid[i][j],b=grid[i+1][j],c=grid[i+1][j+1],d=grid[i][j+1];
        triangle(a,b,d,color);triangle(b,c,d,color);
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
      mesh(geo,mat(0xffffff,{vertexColors:true,side:T.DoubleSide}),0,0,0).userData.interaction={kind:'roof'};
    }
    wall(-1);wall(1);
    // Closed ends, substantial rock faces visible above eye height.
    for(const z of [world.Z_MIN,world.Z_MAX]){
      box(0,27,z+(z<0?-3:3),70,45,6,mat(0xcc8354)).userData.interaction={kind:'roof'};
      for(let i=-3;i<=3;i++)rock('rock_tallC',i*9,23,z,14,range(25,45),15,mat(strata[(i+6)%6]));
    }
    // Low-poly ground, with a pale riverbed-like path winding through the valley.
    const gp=[],gc=[];
    for(let z=world.Z_MIN-28;z<world.Z_MAX+28;z+=4)for(let x=-96;x<96;x+=4){
      const c=new T.Color(0xd4a374).multiplyScalar(range(.94,1.07));
      for(const v of [[x,0,z],[x+4,0,z+4],[x+4,0,z],[x,0,z],[x,0,z+4],[x+4,0,z+4]]){gp.push(...v);gc.push(c.r,c.g,c.b);}
    }
    const groundGeo=new T.BufferGeometry();groundGeo.setAttribute('position',new T.Float32BufferAttribute(gp,3));groundGeo.setAttribute('color',new T.Float32BufferAttribute(gc,3));groundGeo.computeVertexNormals();
    const ground=mesh(groundGeo,mat(0xffffff,{vertexColors:true}),0,0,0);ground.removeFromParent();
    const pathPos=[];for(let z=world.Z_MIN+4;z<32;z+=3){
      const cx=t=>3*Math.sin(t*.055)+1;const a=[cx(z)-2.4,.025,z],b=[cx(z)+2.4,.025,z],c=[cx(z+3)+2.4,.025,z+3],d=[cx(z+3)-2.4,.025,z+3];
      pathPos.push(...a,...c,...b,...a,...d,...c);
    }
    const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(pathPos,3));pg.computeVertexNormals();
    // The editable terrain owns the floor; no overlapping flat path mesh.
    const rockMats=[0xb66945,0xcd8050,0xe19b61,0xe7ae76].map(c=>mat(c));
    for(let z=world.Z_MIN+6;z<34;z+=7){
      const b=world.bounds(z);
      for(const side of [-1,1]){
        const edge=side<0?b.left:b.right;
        const h=range(5,10),w=range(4,7),d=range(5,10),x=edge+side*1.3;
        rock(['rock_largeA','rock_largeC','rock_largeE'][Math.floor(rand()*3)],x+side*3,5,z,w,h,d,rockMats[Math.floor(rand()*4)]);
        if(rand()>.3)rock('rock_tallA',edge+side*range(17,21),range(27,32),z,range(12,18),range(35,46),range(11,18),rockMats[Math.floor(rand()*4)]);
      }
    }
    // Imported plants and smaller stones establish human-scale detail.
    for(let i=0;i<180;i++){
      const z=range(world.Z_MIN+6,32),b=world.bounds(z),side=rand()>.5?1:-1;
      const x=(side<0?b.left:b.right)-side*range(3,6);
      if(z>0&&z<20&&x<0)continue;
      if(z<-158&&z>-225)continue;
      if(i%4===0){model('cactus_tall',x,0,z,range(1.5,3.1),range(0,6.28));world.circle(x,z,.35);}
      else if(i%4===1)model('plant_bush',x,0,z,range(.55,1.3),range(0,6.28),green);
      else if(i%4===2)model('grass_large',x,0,z,range(.35,.8),range(0,6.28),mat(0xb7ad72));
      else model('rock_smallA',x,0,z,range(.3,.8),range(0,6.28),rockMats[2]);
    }
    // Cabin facing the approach. Door is open and has no invisible collider.
    const bx=-7.4,bz=6.2,w=8.4,d=7.2,h=3.8;
    box(bx,.035,bz,w,.07,d,metal);
    function solidPanel(x,y,z,sx,sy,sz,material){box(x,y,z,sx,sy,sz,material);world.box(x,z,sx,sz);}
    solidPanel(bx,1.9,bz-d/2,w,h,.22,cream);
    solidPanel(bx-w/2,1.9,bz,.22,h,d,cream);
    // Side wall includes a dark glazed window (solid glass).
    solidPanel(bx+w/2,.65,bz,.22,1.3,d,cream);
    box(bx+w/2,2.35,bz,.24,1.5,3.8,glass);
    box(bx+w/2,3.45,bz,.22,.7,d,cream);
    box(bx+w/2,2.3,bz-2.9,.22,2,1.4,cream);box(bx+w/2,2.3,bz+2.9,.22,2,1.4,cream);
    const front=bz+d/2;
    solidPanel(bx-2.8,1.9,front,2.8,h,.22,cream);
    solidPanel(bx+2.8,1.9,front,2.8,h,.22,cream);
    box(bx,3.4,front,2.8,.8,.25,metal);
    box(bx-1.48,1.45,front+.1,.18,2.9,.32,metal);box(bx+1.48,1.45,front+.1,.18,2.9,.32,metal);
    box(bx,2.95,front+.12,3.15,.12,.35,orange);
    box(bx,3.95,bz,w+.7,.22,d+.7,metal);
    for(let i=0;i<12;i++)box(bx-w/2+i*.76,4.09,bz,.055,.09,d+.7,cream);
    // Orange identification band and exterior braces.
    box(bx,1.04,bz-d/2-.13,w,.26,.025,orange);
    box(bx-w/2-.13,1.04,bz,.025,.26,d,orange);
    box(bx+w/2+.13,1.04,bz,.025,.26,d,orange);
    for(const side of [-1,1])box(bx+side*2.8,1.04,front+.13,2.8,.26,.025,orange);
    for(const x of [bx-w/2,bx+w/2])for(const z of [bz-d/2,front])box(x,1.95,z,.22,4,.24,metal);
    // Front awning on slender supports.
    const awning=box(bx,3.3,front+1.4,w+.7,.12,2.6,warm);awning.rotation.x=.05;
    for(const x of [bx-w/2-.25,bx+w/2+.25]){cylinder(x,1.6,front+2.5,.07,3.2,metal);world.circle(x,front+2.5,.08);}
    // Solar panels, antenna and weather vane: clearly a mechanic's field station.
    for(let i=0;i<2;i++){
      const panel=new T.Group();panel.position.set(bx+(i-.5)*3.6,4.35,bz-.5);panel.rotation.x=-.24;scene.add(panel);
      box(0,0,0,3.15,.16,2.6,dark,panel);box(0,.095,0,2.94,.04,2.4,glass,panel);
      for(let j=-2;j<=2;j++)box(j*.5,.13,0,.022,.015,2.4,cream,panel);
      for(let j=-1;j<=1;j++)box(0,.13,j*.65,2.94,.015,.022,cream,panel);
    }
    cylinder(bx-3.5,6.15,bz-2.5,.045,4.6,metal);
    segment([bx-4.4,7.1,bz-2.5],[bx-2.6,7.1,bz-2.5],.035,metal);
    const beacon=mesh(new T.SphereGeometry(.11,8,6),mat(0xffa65b,{emissive:0xff6a2b,emissiveIntensity:.5}),bx-3.5,8.5,bz-2.5);
    const flag=mesh(new T.PlaneGeometry(1.2,.65),mat(0xe18a48,{side:T.DoubleSide}),bx-2.9,7.8,bz-2.5);flag.rotation.y=.35;
    // Genuine imported workbench and camping props, not UI stand-ins.
    const workbench=model('workbench',bx-2,.08,bz-2,1.12,Math.PI);world.box(bx-2,bz-2,2.4,1.1);
    workbench.userData.interaction={kind:'bench'};
    const anvil=model('workbench-anvil',bx+2,.08,bz-2,1.15,Math.PI);anvil.removeFromParent();anvil.userData.interaction={kind:'anvil'};
    let anvilInstalled=false;
    function installAnvil(){if(anvilInstalled)return;scene.add(anvil);world.box(bx+2,bz-2,1.7,1.3);anvilInstalled=true;}
    const benchTop=box(bx-2,1.22,bz-2,2.65,.16,1.2,mat(0xb9804d));benchTop.userData.interaction={kind:'bench'};
    const pegboard=box(bx-2,1.92,bz-2.53,2.65,1.15,.09,mat(0x294e4a));pegboard.userData.interaction={kind:'bench'};
    for(let i=0;i<9;i++)for(let j=0;j<3;j++)box(bx-3.12+i*.28,1.65+j*.23,bz-2.47,.035,.035,.035,metal);
    const displayTool=model('tool-pickaxe',bx-2.65,1.5,bz-2.38,.65,.35);displayTool.userData.interaction={kind:'bench'};
    box(bx-1.4,1.33,bz-1.85,.6,.02,.42,tealPaper());
    function tealPaper(){return mat(0x94bcb4);}
    for(let i=0;i<3;i++)box(bx-1.4,1.345,bz-1.98+i*.12,.44,.01,.014,cream);
    box(bx-2,2.57,bz-2.42,2.8,.1,.4,metal);
    box(bx-2,2.5,bz-2.29,2,.04,.08,mat(0xffe4a0,{emissive:0xffcc77,emissiveIntensity:1}));
    // Size by length rather than thickness: a 2.1m sleeping bag along the wall.
    const bed=model('bedroll',bx-2.7,.08,bz+.7,.18,0);
    bed.scale.setScalar(2.1/modelCache.bedroll.size.z);
    bed.userData.interaction={kind:'bed'};
    world.box(bx+2.5,bz+.7,1.2,.7);
    model('bottle-large',bx+2.5,.73,bz+.7,.32);
    for(let i=0;i<3;i++){model(i===2?'box-large':'box',bx-4.9,.02,bz+1+i*1.3,.8+i*.12,.1*i);world.box(bx-4.9,bz+1+i*1.3,1,1);}
    for(let i=0;i<2;i++){model('barrel',bx+5.1,0,bz+1+i*1.3,1.05,.1);world.circle(bx+5.1,bz+1+i*1.3,.48);}
    const light=new T.PointLight(0xffcd83,22,9,2);light.position.set(bx,2.8,bz);scene.add(light);
    box(bx,3.65,bz,1.5,.07,.3,mat(0xffe5a0,{emissive:0xffd68a,emissiveIntensity:1.5}));
    const signs=[];
    function sign(text,x,y,z,width){
      const cv=document.createElement('canvas');cv.width=512;cv.height=128;const ctx=cv.getContext('2d');
      ctx.fillStyle='#244843';ctx.fillRect(0,0,512,128);ctx.fillStyle='#edc58b';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,83);
      const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
      const material=new T.MeshBasicMaterial({map:tex});
      const front=mesh(new T.PlaneGeometry(width,width/4),material,x,y,z+.016);
      const back=mesh(new T.PlaneGeometry(width,width/4),material,x,y,z-.016);
      back.rotation.y=Math.PI; // A separate face keeps reverse-side text readable.
      signs.push({front,back,text});return front;
    }
    sign('FIELD STATION 01',bx,3.48,front+.15,3.1);
    sign('WORKSHOP',bx-2,2.9,bz-d/2+.13,1.8);
    sign('ANVIL / UPGRADE',bx+2,2.1,bz-d/2+.13,1.9);
    // Small mineral outcrops and a marker; no escape vehicles are installed.
    const teal=mat(0x72b6a7,{roughness:.6});
    for(const [x,z] of [[8,-12],[-6,-39],[9,-66]]){
      rock('rock_largeC',x,0,z,2.8,1.1,2.2,rockMats[0]);world.circle(x,z,1.1);
      for(let i=0;i<4;i++){const crystal=mesh(new T.ConeGeometry(.3,1.3,5),teal,x+range(-.7,.7),1,z+range(-.5,.5));crystal.rotation.z=range(-.5,.5);}
    }
    for(const z of [-22,-54]){const x=4+3*Math.sin(z*.055);cylinder(x,.7,z,.045,1.4,metal);sign('↑  CANYON',x,1.35,z,1.2);}
    // FPS input: physical keyboard codes work with the Korean input method too.
    const mine=buildPitfallMine({T,world,scene,mat,mesh,box,cylinder,segment,model,rock,sign,modelCache});
    const excavation=buildExcavation({T,world,scene,mat,box,cylinder,segment,model});
    const p={x:3.7,z:22,yaw:.28,pitch:0,airY:0,vy:0},keys=new Set();let playing=false,dragging=false,last=performance.now(),bob=0,crafting=false;
    const inv=PitfallInventory;let bag=inv.fresh();
    try{bag=inv.restore(localStorage.getItem('pitfall-crafting-v1'));}catch{}
    if(bag.anvilBuilt)installAnvil();
    let activeStation='bench';
    if(excavation.legacyMigration){bag.drops.forEach((d,i)=>{if(!world.free(d.x,d.z,.2)){d.x=4+i%4*.6;d.z=22+Math.floor(i/4)%4*.6;}});try{localStorage.setItem('pitfall-crafting-v1',JSON.stringify(bag));}catch{}}
    const pickups=new Map();
    for(const data of [...mine.resources,...bag.drops])if(!bag.collected.includes(data.key))pickups.set(data.key,mine.spawn(data));
    function mergeStones(){let changed=false;const piles=[];for(const d of bag.drops){if(d.id!=='stone')continue;for(const into of piles){if(!d.count)break;if(into.count>=99||Math.hypot(into.x-d.x,into.z-d.z)>3||Math.abs((into.y||0)-(d.y||0))>.6)continue;const n=Math.min(99-into.count,d.count);into.count+=n;d.count-=n;changed=true;const obj=pickups.get(into.key);if(obj)obj.userData.interaction.data=into;}if(d.count)piles.push(d);else{pickups.get(d.key)?.removeFromParent();pickups.delete(d.key);}}if(changed)bag.drops=bag.drops.filter(d=>d.count>0);}
    mergeStones();
    const stamina=world.staminaState();let sprinting=false;
    const staminaPanel=document.querySelector('.stamina'),staminaFill=document.getElementById('stamina-fill'),staminaValue=document.getElementById('stamina-value'),staminaBar=document.getElementById('stamina-bar'),staminaStatus=document.getElementById('stamina-status');
    const mapCanvas=document.getElementById('minimap'),mapCtx=mapCanvas.getContext('2d');let lastMap=0,mapExpanded=false;mapCanvas.width=mapCanvas.height=640;
    const hotbar=document.getElementById('hotbar'),craftOverlay=document.getElementById('craft-overlay'),craftButton=document.getElementById('craft-button');
    const objective=document.getElementById('objective'),toastNode=document.getElementById('toast');let toastUntil=0,wheelAt=-1000,lastTarget=0,target=null,dragDistance=0;
    const icon=id=>inv.TOOLS[id]?.drill?'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 10H30V29H8ZM12 29H21V44H12" fill="'+inv.TOOLS[id].color+'"/><path d="M30 13L46 20L30 26Z" fill="#d1e6eb"/></svg>':inv.TOOLS[id]?'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 41L30 12" stroke="#cda06b" stroke-width="6" stroke-linecap="round"/><path d="M9 12Q29 2 41 23L29 16L9 18Z" fill="'+inv.TOOLS[id].color+'"/></svg>':'<svg viewBox="0 0 48 48" aria-hidden="true">'+({
      anvil:'<path d="M4 12H43L35 23H28V32L37 38V42H12V38L21 32V23H14Z" fill="#a9bec2"/>',
      boots:'<path d="M8 6H23V29L39 33V42H6V32Z" fill="#80d9ca"/><path d="M6 38H39" stroke="#e8c382" stroke-width="5"/><path d="M13 12H22M13 19H22" stroke="#254d47" stroke-width="3"/>',
      quartz:'<path d="M24 3L39 17L34 36L24 45L10 29L12 12Z" fill="#a4d8ef"/>',
      emerald:'<path d="M24 3L39 17L34 36L24 45L10 29L12 12Z" fill="#4fcb92"/>',
      ruby:'<path d="M24 3L39 17L34 36L24 45L10 29L12 12Z" fill="#e5687c"/>',
      diamond:'<path d="M9 8H39L46 20L24 45L2 20Z" fill="#b6efff"/><path d="M2 20H46M15 8L24 45L33 8" fill="none" stroke="#fff" stroke-width="2"/>',
      ladder:'<path d="M12 3V45M36 3V45M12 10H36M12 20H36M12 30H36M12 40H36" stroke="#c99b63" stroke-width="5"/>',
      torch:'<path d="M23 24V46" stroke="#b18554" stroke-width="7"/><path d="M24 2Q45 27 24 31Q4 25 24 2" fill="#ffbb61"/>',
      headlamp:'<path d="M5 32Q4 8 24 8Q44 8 43 32Z" fill="#dbad67"/><circle cx="24" cy="23" r="9" fill="#d5f8ff"/>',
      scanner:'<rect x="8" y="12" width="32" height="32" rx="5" fill="#789e90"/><circle cx="24" cy="28" r="11" fill="#183f37"/><path d="M24 28L31 20M16 12V3" stroke="#a5efb7" stroke-width="3"/>',
      stick:'<path d="M13 40L34 7M22 25L12 16M27 18L38 17" fill="none" stroke="#cda06b" stroke-width="6" stroke-linecap="round"/>',
      stone:'<path d="M8 32L12 16L26 9L39 19L41 33L26 40Z" fill="#a6bdb6"/><path d="M12 16L27 26L39 19M27 26L26 40" fill="none" stroke="#738d85" stroke-width="2"/>',
      pickaxe:'<path d="M15 41L30 12" stroke="#cda06b" stroke-width="6" stroke-linecap="round"/><path d="M9 12Q29 2 41 23L29 16L9 18Z" fill="#acc5bc"/>'
    }[id]||'')+'</svg>';
    function toast(text){toastNode.textContent=text;toastUntil=performance.now()+3300;}
    function save(){mergeStones();try{localStorage.setItem('pitfall-crafting-v1',JSON.stringify(bag));localStorage.setItem('pitfall-terrain-v2',excavation.dig.serialize());}catch{toast('이 브라우저에서는 자동 저장이 제한됩니다. 현재 플레이는 계속할 수 있습니다.');}}
    const heldScene=new T.Scene(),heldCamera=new T.PerspectiveCamera(76,innerWidth/innerHeight,.01,5),heldRoot=new T.Group();
    heldScene.add(new T.HemisphereLight(0xffedcf,0x577b6d,2.8),heldRoot);let heldId=null;const toolMaterials={};
    function equip(){
      const id=bag.slots[bag.selected]?.id||null;if(id===heldId)return;heldId=id;heldRoot.clear();
      if(!id)return;
      const special=window.makePitfallTool(T,id);if(special){heldRoot.add(special);return;}
      if(id==='boots'){const boot=new T.Mesh(new T.BoxGeometry(.22,.32,.25),mat(0x80d9ca));heldRoot.add(boot);const sole=new T.Mesh(new T.BoxGeometry(.24,.08,.4),mat(0xe8c382));sole.position.set(0,-.16,.07);heldRoot.add(sole);return;}
      if(mine.gems[id]){heldRoot.add(new T.Mesh(new T.OctahedronGeometry(.18),mat(mine.gems[id],{emissive:mine.gems[id],emissiveIntensity:.25})));return;}
      const a=modelCache[id==='stick'?'tree-log-small':id==='stone'?'resource-stone':'tool-pickaxe'];
      let material=a.material;if(inv.TOOLS[id]&&id!=='pickaxe'){if(!toolMaterials[id]){toolMaterials[id]=a.material.clone();toolMaterials[id].color.set(inv.TOOLS[id].color);}material=toolMaterials[id];}
      const m=new T.Mesh(a.geo,material);m.scale.setScalar((inv.TOOLS[id]?.72:id==='stone'?.28:.6)/Math.max(a.size.x,a.size.y,a.size.z));
      m.rotation.set(.12,-.3,-.45);heldRoot.add(m);
    }
    function craftAllowed(){const station=activeStation==='anvil'?anvil:workbench;return crafting&&p.airY===0&&(activeStation!=='anvil'||bag.anvilBuilt)&&Math.hypot(p.x-station.position.x,p.z-station.position.z)<3.3?activeStation:false;}
    const recipeSelect=document.getElementById('recipe-select');recipeSelect.onchange=renderRecipe;
    const recipeGrid=document.createElement('div');recipeGrid.className='recipe-grid';recipeGrid.setAttribute('aria-label','제작 레시피');recipeSelect.after(recipeGrid);recipeSelect.hidden=true;document.querySelector('label[for="recipe-select"]').hidden=true;
    let recipeCategory='pickaxes';const recipeTabs=document.createElement('div');recipeTabs.className='recipe-tabs';recipeGrid.before(recipeTabs);
    const category=id=>inv.TOOLS[id]&&!inv.TOOLS[id].drill?'pickaxes':inv.TOOLS[id]?.drill||['anvil','boots','ladder','torch','headlamp','scanner'].includes(id)?'tools':'structures';
    for(const [id,name] of [['pickaxes','곡괭이'],['tools','도구'],['structures','기타 / 구조물']]){const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.category=id;b.onclick=()=>{recipeCategory=id;const first=Object.keys(inv.RECIPES).find(k=>inv.STATIONS[k]===activeStation&&category(k)===id);if(first)recipeSelect.value=first;renderRecipe();};recipeTabs.append(b);}
    function renderRecipe(){
      const output=recipeSelect.value,recipe=inv.RECIPES[output];
      for(const b of recipeTabs.children)b.setAttribute('aria-pressed',String(b.dataset.category===recipeCategory));
      recipeGrid.replaceChildren();
      for(const id of Object.keys(inv.RECIPES).filter(id=>inv.STATIONS[id]===activeStation&&category(id)===recipeCategory)){
        const button=document.createElement('button');button.type='button';button.className='recipe-card'+(id===output?' selected':'');button.setAttribute('aria-pressed',String(id===output));
        const ready=inv.craft(JSON.parse(JSON.stringify(bag)),craftAllowed(),id).ok;
        button.innerHTML=icon(id)+'<strong>'+inv.ITEMS[id].name+'</strong><small>'+(id==='anvil'&&bag.anvilBuilt?'설치 완료':ready?'제작 가능':'재료 필요')+'</small>';
        button.onclick=()=>{recipeSelect.value=id;renderRecipe();recipeGrid.querySelector('.selected').focus();};recipeGrid.append(button);
      }
      const empty=!recipeGrid.children.length;document.querySelector('.recipe').hidden=empty;if(empty){recipeGrid.textContent='아직 등록된 레시피가 없습니다.';return;}
      document.getElementById('recipe-name').textContent=inv.ITEMS[output].name;document.getElementById('recipe-icon').innerHTML=icon(output);
      document.getElementById('recipe-power').textContent=({ladder:'우클릭 설치 · 지하 벽 전용 · W/S 오르내리기',torch:'우클릭 설치 · 주변 조명',headlamp:'손에 들고 우클릭 · 머리 조명 켜기/끄기',scanner:'손에 들면 근처 광석과 폐광 신호 표시',boots:'우클릭 장착 · 공중 추가 점프',anvil:'기지 오른쪽에 자동 설치'})[output]||('굴착 반경 '+Math.round(inv.TOOLS[output].radius*100)+'cm · 타격 간격 '+(inv.TOOLS[output].cooldown/1000)+'초');
      craftButton.textContent=output==='anvil'?'모루 제작 · 설치':inv.ITEMS[output].name+(activeStation==='anvil'?' 강화':' 제작');
      document.getElementById('ingredients').innerHTML=Object.entries(recipe).map(([id,n])=>'<li><span>'+inv.ITEMS[id].name+'</span><b class="'+(inv.count(bag,id)>=n?'enough':'missing')+'">'+inv.count(bag,id)+' / '+n+'</b></li>').join('');
      const preview=inv.craft(JSON.parse(JSON.stringify(bag)),craftAllowed(),output);craftButton.disabled=!preview.ok;
      document.getElementById('craft-feedback').textContent=preview.ok?(preview.overflow?'제작 후 빈 칸이 없어 완성품을 발밑에 놓습니다.':output==='anvil'?'나뭇가지 6개와 돌멩이 20개를 소비해 모루를 설치합니다.':'표시된 재료를 소비해 '+inv.ITEMS[output].name+'을 만듭니다.'):preview.reason;
    }
    function renderBag(){
      hotbar.innerHTML=bag.slots.map((slot,i)=>'<div class="slot'+(i===bag.selected?' selected':'')+'" aria-label="'+(i+1)+'번 '+(slot?inv.ITEMS[slot.id].name+' '+slot.count+'개':'빈 칸')+'"><span class="slot-number">'+(i+1)+'</span>'+(slot?'<span class="slot-count">'+slot.count+'</span>'+icon(slot.id)+inv.ITEMS[slot.id].name:'<div class="slot-empty">—</div>빈 칸')+'</div>').join('');
      equip();if(crafting)renderRecipe();
    }
    const ray=new T.Raycaster();ray.far=3.3;
    function findTarget(skipStones=false){
      camera.updateMatrixWorld();ray.setFromCamera(new T.Vector2(0,0),camera);
      const first=ray.intersectObjects(scene.children,true).find(hit=>{if(!skipStones)return true;for(let n=hit.object;n;n=n.parent)if(n.userData.interaction?.kind==='pickup'&&n.userData.interaction.data.id==='stone')return false;return true;});if(!first)return null;
      for(let node=first.object;node;node=node.parent)if(node.userData.interaction){const normal=first.face?.normal.clone().transformDirection(first.object.matrixWorld)||new T.Vector3();if(normal.dot(camera.position.clone().sub(first.point))<0)normal.negate();return {...node.userData.interaction,kind:node.userData.interaction.kind==='rock'&&first.point.y>3.4?'roof':node.userData.interaction.kind,point:first.point,normal};}
      return null;
    }
    function lock(){canvas.focus();try{canvas.requestPointerLock?.()?.catch?.(()=>{});}catch{}}
    let swing=0,lastStrike=-1000;const miningInfo=document.createElement('div');miningInfo.className='mining-info';document.body.append(miningInfo);
    function giveLoot(id){
      const result=inv.pickup(bag,id,1);
      if(result.ok)return toast(inv.ITEMS[id].name+' +1');
      const data={key:'mined-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),id,count:1,x:p.x,y:p.airY,z:p.z};bag.drops.push(data);pickups.set(data.key,mine.spawn(data));toast('가방이 가득 찼습니다. '+inv.ITEMS[id].name+'을 발밑에 내려놓았습니다.');
    }
    function interact(drillDown=false,collect=false){
      if(!playing||crafting||vitals.resting)return;let hit=findTarget(!collect&&!!inv.TOOLS[heldId]);
      if(drillDown&&inv.TOOLS[heldId]?.drill){hit=null;for(let y=p.airY+.1;y>=p.airY-3;y-=.05){if(excavation.dig.density(p.x,y,p.z)>=0){hit={kind:'rock',point:new T.Vector3(p.x,y,p.z),normal:new T.Vector3(0,1,0)};break;}}}
      if(!hit)return;
      if(hit.kind==='bed'){clear();vitals.sleep();return;}
      if(hit.kind==='flora'){exploration.harvest(hit.id);return;}
      if(hit.kind==='placed')return;
      if(hit.kind==='pack'||hit.kind==='storage'){equipment.open(hit.kind);return;}
      if(['rock','vein','roof'].includes(hit.kind)){
        if(!inv.TOOLS[heldId])return toast('곡괭이를 선택해야 캘 수 있습니다.');
        const now=performance.now();if(now-lastStrike<inv.TOOLS[heldId].cooldown)return;
        if(stamina.value<1||stamina.exhausted)return toast('숨을 고른 뒤 다시 캐세요.');
        lastStrike=now;swing=.55;stamina.value-=1;stamina.delay=.4;
        const result=excavation.strike(hit,p,inv.TOOLS[heldId]);for(const id of result?.loot||[])giveLoot(id);
        if(result?.warning)toast(result.warning);target=null;save();renderBag();return;
      }
      if(hit.kind==='bench'||hit.kind==='anvil'){
        if(p.airY>0)return toast('바닥에 내려선 뒤 제작대를 사용하세요.');
        activeStation=hit.kind;
        recipeCategory='pickaxes';
        recipeSelect.innerHTML=Object.keys(inv.RECIPES).filter(id=>inv.STATIONS[id]===activeStation).map(id=>'<option value="'+id+'">'+inv.ITEMS[id].name+'</option>').join('');
        document.getElementById('craft-title').textContent=activeStation==='anvil'?'모루 · 보석 강화':'기지 제작대';
        document.getElementById('craft-description').textContent=activeStation==='anvil'?'수정 → 에메랄드 → 루비. 기존 곡괭이에 보석 3개를 더해 강화하세요.':'도구와 기지 시설을 제작하세요. 모루를 만들면 오른쪽 강화 공간에 설치됩니다.';
        craftOverlay.dataset.station=activeStation;
        crafting=true;playing=false;clear();menu.hidden=true;craftOverlay.hidden=false;document.exitPointerLock?.();renderRecipe();document.getElementById('craft-close').focus();return;
      }
      const data=hit.data,result=inv.pickup(bag,data.id,data.count,data.key);
      if(!result.ok)return toast(result.reason);
      const obj=pickups.get(data.key);obj?.removeFromParent();pickups.delete(data.key);target=null;
      save();renderBag();toast(inv.ITEMS[data.id].name+' +'+data.count);
    }
    function closeCraft(resume){crafting=false;craftOverlay.hidden=true;target=null;if(resume){playing=true;menu.hidden=true;lock();}else pause();}
    document.getElementById('recipe-icon').innerHTML=icon('pickaxe');
    document.getElementById('craft-close').onclick=()=>closeCraft(true);
    craftButton.onclick=()=>{
      const output=recipeSelect.value,result=inv.craft(bag,craftAllowed(),output);if(!result.ok){renderRecipe();return toast(result.reason);}
      if(bag.anvilBuilt)installAnvil();
      if(result.overflow){const data={key:'crafted-'+Date.now().toString(36),id:result.overflow,count:1,x:p.x,z:p.z};bag.drops.push(data);pickups.set(data.key,mine.spawn(data));}
      save();renderBag();document.getElementById('craft-feedback').textContent=output==='anvil'?'기지 오른쪽에 모루가 설치되었습니다. 모루를 클릭해 강화하세요.':inv.ITEMS[output].name+' 완성! 창을 닫으면 손에 장착됩니다.';toast(inv.ITEMS[output].name+' 제작 완료');
      if(result.overflow)document.getElementById('craft-feedback').textContent=inv.ITEMS[output].name+' 완성! 발밑에 놓았습니다. 빈 칸을 만든 뒤 주우세요.';
    };
    craftOverlay.addEventListener('keydown',e=>{if(e.code==='Tab'){e.preventDefault();const controls=[document.getElementById('craft-close'),...recipeGrid.querySelectorAll('button'),...(craftButton.disabled?[]:[craftButton])],i=controls.indexOf(document.activeElement);controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}});
    function dropSelected(){
      if(p.airY>0)return toast('착지한 뒤 내려놓으세요.');if(!bag.slots[bag.selected])return;
      const v=world.direction(p.yaw,1,0),x=p.x+v.x*1.25,z=p.z+v.z*1.25;
      if(!world.free(x,z,.15))return toast('앞쪽에 내려놓을 공간이 없습니다.');
      const data=inv.drop(bag,x,z);data.y=p.airY;pickups.set(data.key,mine.spawn(data));save();renderBag();toast(inv.ITEMS[data.id].name+' 내려놓음');
    }
    canvas.addEventListener('wheel',e=>{if(!playing||crafting||!e.deltaY)return;e.preventDefault();const now=performance.now();if(now-wheelAt<130)return;wheelAt=now;inv.select(bag,Math.sign(e.deltaY));renderBag();save();},{passive:false});
    function drawMap(){
      const ctx=mapCtx,s=mapExpanded?320/(world.Z_MAX-world.Z_MIN+20):320/70,centerX=mapExpanded?0:p.x,centerZ=mapExpanded?(world.Z_MIN+world.Z_MAX)/2:p.z,X=x=>160+(x-centerX)*s,Z=z=>160+(z-centerZ)*s;ctx.setTransform(2,0,0,2,0,0);
      ctx.fillStyle='#b77c52';ctx.fillRect(0,0,320,320);
      ctx.beginPath();world.slices.forEach((v,i)=>i?ctx.lineTo(X(v.left),Z(v.z)):ctx.moveTo(X(v.left),Z(v.z)));
      for(let i=world.slices.length-1;i>=0;i--)ctx.lineTo(X(world.slices[i].right),Z(world.slices[i].z));
      ctx.closePath();ctx.fillStyle='#d6b88a';ctx.fill();ctx.strokeStyle='#704d3a';ctx.lineWidth=4;ctx.stroke();
      ctx.fillStyle='#926d4d';for(const o of world.obstacles){if(o.kind==='circle'){ctx.beginPath();ctx.arc(X(o.x),Z(o.z),o.r*s,0,Math.PI*2);ctx.fill();}}
      ctx.fillStyle='#285953';ctx.fillRect(X(bx-w/2),Z(bz-d/2),w*s,d*s);ctx.strokeStyle='#f4d096';ctx.lineWidth=3;ctx.strokeRect(X(bx-w/2),Z(bz-d/2),w*s,d*s);
      if(Math.abs(bx-p.x)<29&&Math.abs(bz-p.z)<29){ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillStyle='#203d37';ctx.fillText('기지',X(bx),Z(bz-d/2)-9);}
      excavation.drawMap(ctx,X,Z,s);
      for(const obj of pickups.values()){ctx.fillStyle=obj.userData.interaction.data.id==='stick'?'#6a4f32':'#518a7d';ctx.beginPath();ctx.arc(X(obj.position.x),Z(obj.position.z),3,0,Math.PI*2);ctx.fill();}
      if(!equipment.state.worn){const pack=equipment.state,x=Math.max(14,Math.min(306,X(pack.x))),z=Math.max(24,Math.min(296,Z(pack.z)));ctx.fillStyle='#ffcb64';ctx.strokeStyle='#3b3024';ctx.lineWidth=2;ctx.fillRect(x-7,z-8,14,17);ctx.strokeRect(x-7,z-8,14,17);ctx.strokeRect(x-3,z-12,6,4);ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('배낭',x,z+23);mapCanvas.dataset.backpackVisible='true';}else mapCanvas.dataset.backpackVisible='false';
      ctx.save();ctx.translate(X(p.x),Z(p.z));ctx.rotate(-p.yaw);
      ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,42,-Math.PI/2-.6,-Math.PI/2+.6);ctx.closePath();ctx.fillStyle='#205f5e33';ctx.fill();
      ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(9,10);ctx.lineTo(0,6);ctx.lineTo(-9,10);ctx.closePath();ctx.fillStyle='#f5faf0';ctx.strokeStyle='#254c48';ctx.lineWidth=3;ctx.fill();ctx.stroke();ctx.restore();
    }
    const vitals=buildVitals({p,stamina,toast});
    const exploration=buildExploration({T,scene,camera,p,bag,world,excavation,save,renderBag,toast,giveLoot});
    const equipment=buildEquipment({T,scene,world,p,bag,stamina,model,save,renderBag,toast,icon,setPaused(value){playing=!value;clear();menu.hidden=true;if(value)document.exitPointerLock?.();else lock();}});
    const hint=document.getElementById('hint'),heading=document.getElementById('heading'),zone=document.getElementById('zone'),coords=document.getElementById('coords');let showingCoords=false;
    const pitchLimit=89*Math.PI/180;let lookX=0,lookY=0,ignoreMouseUntil=0;
    function clear(){keys.clear();dragging=false;lookX=0;lookY=0;}
    function pause(){playing=false;clear();if(crafting||equipment.opened)return;menu.hidden=false;document.getElementById('enter').textContent='탐험 계속하기';hint.textContent='';}
    function look(dx,dy){if(performance.now()<ignoreMouseUntil||!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>300||Math.abs(dy)>300)return;lookX=Math.max(-400,Math.min(400,lookX+dx));lookY=Math.max(-400,Math.min(400,lookY+dy));}
    document.getElementById('enter').addEventListener('click',()=>{
      document.getElementById('reset-confirm').hidden=true;
      playing=true;menu.hidden=true;canvas.focus();
      try{const result=canvas.requestPointerLock?.();if(result?.catch)result.catch(()=>{message.textContent='마우스를 누른 채 움직이면 시점을 돌릴 수 있습니다.';});}catch{ /* Drag-to-look remains available. */ }
    });
    const resetConfirm=document.getElementById('reset-confirm');
    document.getElementById('respawn').onclick=()=>{clear();vitals.respawn();p.grounded=true;p.landingSpeed=0;save();playing=true;menu.hidden=true;lock();};
    document.getElementById('reset-game').onclick=()=>{resetConfirm.hidden=false;document.getElementById('reset-cancel').focus();};
    document.getElementById('reset-cancel').onclick=()=>{resetConfirm.hidden=true;document.getElementById('reset-game').focus();};
    document.getElementById('reset-yes').onclick=()=>{try{for(const k of ['pitfall-exploration-v1','pitfall-health-v1','pitfall-equipment-v1','pitfall-crafting-v1','pitfall-terrain-v2','pitfall-dig-v1','pitfall-dig-v1-backup'])localStorage.removeItem(k);location.reload();}catch{toast('저장소를 초기화하지 못했습니다. 브라우저 설정을 확인하세요.');}};
    document.addEventListener('pointerlockchange',()=>{lookX=lookY=0;ignoreMouseUntil=performance.now()+80;if(document.pointerLockElement!==canvas&&playing)pause();});
    document.addEventListener('pointerlockerror',()=>{message.textContent='마우스를 누른 채 드래그하거나 방향키로 둘러보세요.';});
    canvas.addEventListener('mousedown',e=>{if(playing&&e.button===0){dragging=true;dragDistance=0;if(document.pointerLockElement===canvas)interact(!!inv.TOOLS[heldId]?.drill);}});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('mousedown',e=>{if(playing&&!vitals.resting&&e.button===2){e.preventDefault();if(!exploration.use(findTarget()))equipment.rightClick();}});
    addEventListener('mouseup',()=>{if(dragging&&dragDistance<4&&document.pointerLockElement!==canvas)interact();dragging=false;});
    addEventListener('mousemove',e=>{if(playing&&(document.pointerLockElement===canvas||dragging)){dragDistance+=Math.abs(e.movementX)+Math.abs(e.movementY);look(e.movementX,e.movementY);}});
    addEventListener('keydown',e=>{
      if(e.code==='F2'){e.preventDefault();if(!e.repeat){mapExpanded=!mapExpanded;mapCanvas.closest('.minimap').classList.toggle('expanded',mapExpanded);mapCanvas.setAttribute('aria-label',mapExpanded?'전체 협곡 지도 · F2로 닫기':'주변 지형 · F2로 확대');drawMap();}return;}
      if(e.code==='F3'){e.preventDefault();showingCoords=true;coords.hidden=false;return;}
      if(e.code==='Escape'){if(crafting)closeCraft(false);else pause();document.exitPointerLock?.();return;}
      if(!playing||vitals.resting)return;
      if(e.code==='Digit4'&&!e.repeat){e.preventDefault();equipment.dropPack();return;}
      if(e.code==='KeyE'&&!e.repeat){interact(false,true);return;}
      if(e.code==='KeyQ'&&!e.repeat){dropSelected();return;}
      if(/^Digit[123]$/.test(e.code)){bag.selected=Number(e.code.at(-1))-1;renderBag();save();return;}
      if(e.code==='Space'&&!e.repeat){e.preventDefault();if(!equipment.jump()&&p.airY===0)toast('점프에는 스태미나 9와 머리 위 여유 공간이 필요합니다.');}
      if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);}
    });
    addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='F3'){showingCoords=false;coords.hidden=true;}});addEventListener('blur',()=>{showingCoords=false;coords.hidden=true;pause();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    document.getElementById('credits-link').addEventListener('click',e=>{e.preventDefault();document.getElementById('credits').classList.toggle('open');});
    document.getElementById('close-credits').onclick=()=>document.getElementById('credits').classList.remove('open');
    function tick(now){
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(playing&&!vitals.resting){
        const blend=1-Math.exp(-35*dt),dx=lookX*blend,dy=lookY*blend;lookX-=dx;lookY-=dy;p.yaw-=dx*.0022;p.pitch=Math.max(-pitchLimit,Math.min(pitchLimit,p.pitch-dy*.0022));
        if(keys.has('ArrowLeft'))p.yaw+=dt*1.5;if(keys.has('ArrowRight'))p.yaw-=dt*1.5;
        if(keys.has('ArrowUp'))p.pitch=Math.min(pitchLimit,p.pitch+dt);if(keys.has('ArrowDown'))p.pitch=Math.max(-pitchLimit,p.pitch-dt);
        const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
        const v=world.direction(p.yaw,forward,right);
        const requested=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&!!(forward||right);
        const allowed=world.canSprint(stamina,requested),speed=(allowed?6.8:4.1)*(p.jumping?1.25:1);
        const oldX=p.x,oldZ=p.z;if(!exploration.climbing(keys)||keys.has('KeyA')||keys.has('KeyD'))world.move(p,v.x*speed*dt,v.z*speed*dt);
        const moved=Math.hypot(p.x-oldX,p.z-oldZ)>.001;sprinting=allowed&&moved;
        world.updateStamina(stamina,dt,sprinting,requested);
        if(!exploration.update(dt,keys))world.gravity(p,dt);if(p.landingSpeed<-12)vitals.damage(Math.round((Math.abs(p.landingSpeed)-12)*5));p.landingSpeed=0;
        const digEvent=excavation.update(dt,p);
        if(digEvent==='collapse-hit')vitals.damage(35);
        if(digEvent){toast(digEvent==='discovery'?'암벽 너머에서 오래된 폐광을 발견했습니다!':'천장이 무너졌습니다. 입구로 대피했습니다. 무너진 곳은 다시 팔 수 있습니다.');save();}
        if(dragging&&inv.TOOLS[heldId]?.drill)interact(true);
        swing=Math.max(0,swing-dt);
        if(moved)bob+=dt*8;else bob=0;
      }
      const amount=Math.round(stamina.value);
      staminaFill.style.width=stamina.value+'%';staminaValue.textContent=amount+' / 100';staminaBar.setAttribute('aria-valuenow',amount);
      staminaPanel.classList.toggle('low',amount<30);staminaPanel.classList.toggle('exhausted',stamina.exhausted);
      staminaStatus.textContent=stamina.exhausted?'지침 · SHIFT를 놓고 회복':p.jumping?'점프 · 이동 속도 증가':playing&&sprinting?'달리는 중':stamina.value<100?'숨 고르는 중':'SHIFT · 달리기';
      if(now-lastMap>200){drawMap();lastMap=now;}
      camera.position.set(p.x,1.72+world.cameraFeet(p,dt)+Math.sin(bob)*.018+Math.sin(now*.09)*excavation.shake,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');
      const inBase=p.x>bx-w/2&&p.x<bx+w/2&&p.z>bz-d/2&&p.z<front;
      zone.textContent=inBase?'간이 기지 · 내부':excavation.zone(p)||(p.z<-25?'붉은 협곡 · 탐사 구역':'붉은 협곡 · 기지 주변');
      heading.textContent=String(Math.round(((-p.yaw*180/Math.PI)%360+360)%360)).padStart(3,'0')+'°';
      if(showingCoords){coords.textContent='X '+p.x.toFixed(2)+'  Y '+(p.airY||0).toFixed(2)+'  Z '+p.z.toFixed(2);coords.hidden=false;}
      if(now-lastTarget>100){target=playing?findTarget():null;lastTarget=now;}
      hint.textContent=playing&&target?(target.kind==='anvil'?'좌클릭 / E · 모루 강화':target.kind==='bench'?'좌클릭 / E · 제작대 열기':target.kind==='pickup'?'좌클릭 / E · '+inv.ITEMS[target.data.id].name+' 줍기':!inv.TOOLS[heldId]?'곡괭이를 선택해 암벽을 캐세요':target.kind==='roof'?'천장 · 계속 캐면 붕괴 위험':'좌클릭 / E · '+(target.kind==='vein'?inv.ITEMS[target.gem].name+' 채굴':'암벽 굴착')):playing&&inBase?'제작대를 바라보고 클릭해 조합하세요.':'';
      const hp=target?.kind==='vein'?excavation.dig.state.veins[target.id]||0:0;
      if(playing&&target?.kind==='pack')hint.textContent='좌클릭 / E · 배낭 열기 · 보관 / 다시 착용';
      if(playing&&target?.kind==='bed')hint.textContent='좌클릭 / E · 수면 · 체력과 스태미나 모두 회복';
      if(playing&&target?.kind==='flora')hint.textContent='좌클릭 / E · 가시 줄기 채집';
      if(playing&&target?.kind==='storage')hint.textContent='좌클릭 / E · 보관 상자 열기';
      miningInfo.textContent=excavation.pending?'붕괴 임박 · 뒤로 물러나세요!':playing&&hp?'보석 균열 '+hp+' / 3':playing&&target?.kind==='rock'?'맞힌 부분이 조금씩 깎입니다 · 발밑과 옆도 넓혀 통로를 만드세요':'';
      objective.textContent=bag.crafted?(excavation.dig.state.discovered?'폐광 발견 · 벽에 박힌 보석을 캐세요':'협곡 양쪽 암벽을 탐사하세요 · 폐광의 위치는 알 수 없습니다'):inv.count(bag,'stick')>=3&&inv.count(bag,'stone')>=2?'기지 제작대로 돌아가 곡괭이 만들기':'바닥에서 재료 모으기 · 나뭇가지 '+inv.count(bag,'stick')+'/3 · 돌멩이 '+inv.count(bag,'stone')+'/2';
      if(now>toastUntil)toastNode.textContent='';
      flag.rotation.y=.35+Math.sin(now*.001)*.07;
      renderer.autoClear=false;renderer.clear();renderer.render(scene,camera);
      if(heldId&&playing){const strike=Math.sin((1-swing/.55)*Math.PI)*(swing>0?1:0);heldRoot.position.set(.45-strike*.25,-.48+Math.sin(bob)*.012+strike*.12,-.85-strike*.2);heldRoot.rotation.set(-strike*.75,0,strike*.65);renderer.clearDepth();renderer.render(heldScene,heldCamera);}
      requestAnimationFrame(tick);
    }
    addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();heldCamera.aspect=camera.aspect;heldCamera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();message.textContent='그래픽 연결이 중단됐습니다. 페이지를 새로고침해 주세요.';});
    // Read-only diagnostics make renderer and movement tests reproducible.
    window.pitfallDebug={snapshot:()=>({x:p.x,z:p.z,yaw:p.yaw,pitch:p.pitch,airY:p.airY,playing,crafting,inventory:JSON.parse(JSON.stringify(bag)),target:target?.kind,stamina:stamina.value,exhausted:stamina.exhausted,sprinting:playing&&sprinting,inside:world.free(p.x,p.z),inBase:p.x>bx-w/2&&p.x<bx+w/2&&p.z>bz-d/2&&p.z<front,models:Object.keys(modelCache).length,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls}),details:()=>({mine:mine.entrance,resources:mine.resources,bench:workbench.position.toArray(),anvil:{position:anvil.position.toArray(),installed:anvilInstalled},bedSize:new T.Box3().setFromObject(bed).getSize(new T.Vector3()).toArray(),signs:signs.map(s=>({text:s.text,front:s.front.rotation.y,back:s.back.rotation.y}))}),world};
    window.pitfallDebug.mining=()=>({summary:excavation.summary(),pending:excavation.pending,target:target?{kind:target.kind,point:target.point?.toArray(),normal:target.normal?.toArray(),id:target.id,gem:target.gem}:null,terrain:excavation.diagnostics(),veins:{...excavation.dig.state.veins},swing});
    window.pitfallDebug.equipment=()=>JSON.parse(JSON.stringify(equipment.state));
    renderBag();
    document.getElementById('enter').disabled=false;document.getElementById('enter').textContent='협곡 탐험 시작';
    requestAnimationFrame(tick);
  }catch(error){message.classList.add('error');message.textContent='시작하지 못했습니다: '+error.message;console.error(error);}
})();


