(function(root){
  'use strict';
  const ITEMS={stick:{name:'나뭇가지',max:99},stone:{name:'돌멩이',max:99},pickaxe:{name:'돌 곡괭이',max:1},quartz:{name:'수정',max:99},emerald:{name:'에메랄드',max:99},ruby:{name:'루비',max:99}};
  const RECIPE={stick:3,stone:2};
  const TOOLS={pickaxe:{radius:.42,cooldown:600,damage:1,color:'#acc5bc'},quartz_pickaxe:{radius:.65,cooldown:500,damage:1,color:'#a4d8ef'},emerald_pickaxe:{radius:.85,cooldown:420,damage:2,color:'#4fcb92'},ruby_pickaxe:{radius:1,cooldown:350,damage:3,color:'#e5687c'}};
  const RECIPES={pickaxe:RECIPE,quartz_pickaxe:{pickaxe:1,quartz:2},anvil:{stick:6,stone:20},emerald_pickaxe:{quartz_pickaxe:1,emerald:3},ruby_pickaxe:{emerald_pickaxe:1,ruby:3}};
  const STATIONS={pickaxe:'bench',quartz_pickaxe:'anvil',anvil:'bench',emerald_pickaxe:'anvil',ruby_pickaxe:'anvil'};
  ITEMS.anvil={name:'모루',max:1};
  ITEMS.diamond={name:'다이아몬드',max:99};ITEMS.diamond_pickaxe={name:'다이아몬드 곡괭이',max:1};TOOLS.diamond_pickaxe={radius:1.2,cooldown:280,damage:4,color:'#b6efff'};RECIPES.diamond_pickaxe={ruby_pickaxe:1,diamond:3};STATIONS.diamond_pickaxe='anvil';
  ITEMS.boots={name:'중력부츠',max:1};RECIPES.boots={stone:8,quartz:3,emerald:1};STATIONS.boots='bench';
  for(const [id,name,recipe,station] of [['ladder','나무 사다리',{stick:4,stone:2},'bench'],['torch','설치형 횃불',{stick:2,stone:1},'bench'],['headlamp','광산용 헤드램프',{stone:4,quartz:2,emerald:1},'bench'],['scanner','광맥 탐지기',{quartz:3,emerald:2,ruby:1},'anvil']]){ITEMS[id]={name,max:id==='ladder'||id==='torch'?20:1};RECIPES[id]=recipe;STATIONS[id]=station;}
  ['pickaxe','quartz_pickaxe','emerald_pickaxe','ruby_pickaxe','diamond_pickaxe'].forEach((id,tier)=>TOOLS[id].tier=tier);
  const ORE_REQUIREMENTS={quartz:'pickaxe',emerald:'quartz_pickaxe',ruby:'emerald_pickaxe',diamond:'ruby_pickaxe'};
  for(const [gem,tier,radius,cooldown] of [['emerald',2,.65,480],['ruby',3,.9,350],['diamond',4,1.2,280]]){const id=gem+'_drill';ITEMS[id]={name:({emerald:'에메랄드',ruby:'루비',diamond:'다이아몬드'})[gem]+' 드릴',max:1};TOOLS[id]={tier,radius,cooldown,damage:tier,drill:true,color:TOOLS[gem+'_pickaxe'].color};STATIONS[id]='anvil';RECIPES[id]=gem==='emerald'?{stone:8,quartz:2,emerald:3}:{[gem==='ruby'?'emerald_drill':'ruby_drill']:1,[gem]:3};}
  function canMine(tool,gem){const required=TOOLS[ORE_REQUIREMENTS[gem]];return !!required&&Number.isInteger(tool?.tier)&&tool.tier>=required.tier;}
  for(const [gem,name] of [['quartz','수정'],['emerald','에메랄드'],['ruby','루비']])ITEMS[gem+'_pickaxe']={name:name+' 곡괭이',max:1};
  const fresh=()=>({version:1,slots:[null,null,null],selected:0,collected:[],drops:[],crafted:0,anvilBuilt:false});
  const copy=s=>JSON.parse(JSON.stringify(s));
  const count=(s,id)=>s.slots.reduce((n,v)=>n+(v?.id===id?v.count:0),0);
  function put(slots,id,n){
    for(const slot of slots)if(slot?.id===id){const add=Math.min(ITEMS[id].max-slot.count,n);slot.count+=add;n-=add;}
    for(let i=0;i<slots.length&&n;i++)if(!slots[i]){const add=Math.min(ITEMS[id].max,n);slots[i]={id,count:add};n-=add;}
    return n===0;
  }
  function pickup(s,id,n=1,source){
    if(!ITEMS[id]||!Number.isInteger(n)||n<1)return {ok:false,reason:'올바르지 않은 아이템입니다.'};
    if(source&&s.collected.includes(source))return {ok:false,reason:'이미 주운 아이템입니다.'};
    const draft=copy(s);
    if(!put(draft.slots,id,n))return {ok:false,reason:'가방 3칸이 가득 찼습니다. Q로 선택한 아이템을 내려놓으세요.'};
    if(source){draft.collected.push(source);draft.drops=draft.drops.filter(d=>d.key!==source);}
    Object.assign(s,draft);return {ok:true};
  }
  function craft(s,station,output='pickaxe'){
    if(station===true)station='bench';
    if(!station||STATIONS[output]!==station)return {ok:false,reason:STATIONS[output]==='anvil'?'모루에서만 강화할 수 있습니다.':'기지 제작대에서만 만들 수 있습니다.'};
    if(station==='anvil'&&!s.anvilBuilt)return {ok:false,reason:'제작대에서 모루를 먼저 만드세요.'};
    if(output==='anvil'&&s.anvilBuilt)return {ok:false,reason:'기지에 모루가 이미 설치되어 있습니다.'};
    const recipe=RECIPES[output];if(!recipe)return {ok:false,reason:'없는 레시피입니다.'};
    if(Object.keys(recipe).some(id=>count(s,id)<recipe[id]))return {ok:false,reason:Object.entries(recipe).map(([id,n])=>ITEMS[id].name+' '+n+'개').join(' + ')+'가 필요합니다.'};
    const draft=copy(s);
    for(const [id,amount] of Object.entries(recipe)){
      let remaining=amount;
      draft.slots=draft.slots.map(slot=>{if(slot?.id===id){const n=Math.min(remaining,slot.count);remaining-=n;slot.count-=n;}return slot?.count?slot:null;});
    }
    let overflow=null;
    if(output==='anvil')draft.anvilBuilt=true;
    else {if(!put(draft.slots,output,1))overflow=output;else draft.selected=draft.slots.findIndex(v=>v?.id===output);}
    draft.crafted++;Object.assign(s,draft);return {ok:true,overflow};
  }
  function drop(s,x,z){
    const slot=s.slots[s.selected];if(!slot)return null;
    const data={key:'drop-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),id:slot.id,count:slot.count,x,z};
    s.drops.push(data);s.slots[s.selected]=null;return data;
  }
  function select(s,step){s.selected=((s.selected+step)%3+3)%3;}
  function transfer(from,to,index){const item=from[index];if(!item)return false;const draft=copy(to);if(!put(draft,item.id,item.count))return false;to.splice(0,to.length,...draft);from[index]=null;return true;}
  function restore(raw){
    try{const v=JSON.parse(raw);if(v?.version!==1||!Array.isArray(v.slots)||v.slots.length!==3)return fresh();
      if(!v.slots.every(s=>s===null||(ITEMS[s.id]&&Number.isInteger(s.count)&&s.count>0&&s.count<=ITEMS[s.id].max)))return fresh();
      const s=fresh();s.slots=v.slots;s.selected=Number.isInteger(v.selected)&&v.selected>=0&&v.selected<3?v.selected:0;
      s.collected=Array.isArray(v.collected)?v.collected.filter(k=>typeof k==='string'):[];
      s.drops=Array.isArray(v.drops)?v.drops.filter(d=>typeof d.key==='string'&&ITEMS[d.id]&&Number.isInteger(d.count)&&d.count>0&&d.count<=9999&&Number.isFinite(d.x)&&Number.isFinite(d.z)&&Math.abs(d.x)<90&&d.z>-288&&d.z<60):[];
      s.crafted=Number.isInteger(v.crafted)&&v.crafted>=0?v.crafted:0;s.anvilBuilt=v.anvilBuilt===true;return s;
    }catch{return fresh();}
  }
  root.PitfallInventory={ITEMS,RECIPE,RECIPES,STATIONS,TOOLS,ORE_REQUIREMENTS,canMine,fresh,count,pickup,craft,drop,select,restore,transfer};
  if(typeof module!=='undefined')module.exports=root.PitfallInventory;
})(typeof window!=='undefined'?window:globalThis);
