(function(root){
  'use strict';
  const SITES={
    'wind-cleft':{name:'매몰된 바람 쉼터',x:18.2,y:-2.2,z:-46,side:1,radius:2.5,height:3.6,loot:[{id:'headlamp',count:1},{id:'scanner',count:1},{id:'ladder',count:8},{id:'torch',count:8}]},
    'fossil-hollow':{name:'봉인된 화석 관측실',x:-17.4,y:-7.2,z:-91,side:-1,radius:2.7,height:3.8,loot:[{id:'boots',count:1},{id:'gold_scanner',count:1},{id:'storage_chest',count:2},{id:'vertical_conveyor',count:4}]},
    'geode-sanctum':{name:'심층 지오드 보관소',x:16.7,y:-13.2,z:-137,side:1,radius:2.8,height:4,loot:[{id:'diamond_pickaxe',count:1},{id:'diamond_drill',count:1},{id:'conveyor',count:8},{id:'iron_plate',count:6},{id:'gold_ingot',count:4}]}
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  function opened(state){return state.openedSecrets=Array.isArray(state.openedSecrets)?state.openedSecrets:[];}
  function claim(state,id){const site=SITES[id];if(!site)throw Error('없는 비밀 공간입니다.');if(opened(state).includes(id))throw Error('이미 열린 비밀 상자입니다.');state.openedSecrets.push(id);return clone(site.loot);}
  function openChest(state,id){const site=SITES[id];if(!site)throw Error('없는 비밀 공간입니다.');const wasOpened=opened(state).includes(id);state.secretChests=state.secretChests&&typeof state.secretChests==='object'?state.secretChests:{};if(!Array.isArray(state.secretChests[id])){const slots=Array(12).fill(null);site.loot.forEach((item,i)=>slots[i]=clone(item));state.secretChests[id]=slots;}if(!wasOpened)state.openedSecrets.push(id);return state.secretChests[id];}
  function rooms({openedSecrets=[],furnaceBuilt=false,belts=0}={}){const result=[];if(openedSecrets.length>=1)result.push('map');if(openedSecrets.length>=2)result.push('storage');if(furnaceBuilt&&openedSecrets.length>=2)result.push('smelter');if(openedSecrets.length>=3&&furnaceBuilt&&belts>=2)result.push('power');return result;}
  function effects(roomIds=[]){const has=id=>roomIds.includes(id);return {mapSecrets:has('map'),chestSlots:has('storage')?24:12,smeltCapacity:has('smelter')?6:4,conveyorSpeed:has('power')?1.5:1};}
  function nearbySecret(position,openedSecrets=[],range=10){let best=null;for(const [id,site] of Object.entries(SITES)){if(openedSecrets.includes(id))continue;const d=Math.hypot(position.x-site.x,(position.y??position.airY??0)-site.y,position.z-site.z);if(d<=range&&(!best||d<best.distance))best={id,...site,distance:d};}return best;}
  root.PitfallDiscoveryRules={SITES,claim,openChest,rooms,effects,nearbySecret};
  if(typeof module!=='undefined')module.exports=root.PitfallDiscoveryRules;
})(typeof window!=='undefined'?window:globalThis);
