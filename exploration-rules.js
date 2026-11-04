(function(root){
  'use strict';
  const SITES={
    'wind-cleft':{name:'바람 균열 쉼터',x:10.4,y:0,z:-46,loot:[{id:'quartz',count:2},{id:'ladder',count:2},{id:'torch',count:3}]},
    'fossil-hollow':{name:'화석 골방',x:-13.1,y:0,z:-91,loot:[{id:'emerald',count:2},{id:'iron_plate',count:2},{id:'headlamp',count:1}]},
    'geode-sanctum':{name:'수정 지오드 동굴',x:8.7,y:0,z:-137,loot:[{id:'ruby',count:1},{id:'gold_ingot',count:2},{id:'diamond',count:1}]}
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  function opened(state){return state.openedSecrets=Array.isArray(state.openedSecrets)?state.openedSecrets:[];}
  function claim(state,id){const site=SITES[id];if(!site)throw Error('없는 비밀 공간입니다.');if(opened(state).includes(id))throw Error('이미 열린 비밀 상자입니다.');state.openedSecrets.push(id);return clone(site.loot);}
  function rooms({openedSecrets=[],furnaceBuilt=false,belts=0}={}){const result=[];if(openedSecrets.length>=1)result.push('map');if(openedSecrets.length>=2)result.push('storage');if(furnaceBuilt)result.push('smelter');if(openedSecrets.length>=3&&furnaceBuilt&&belts>=2)result.push('power');return result;}
  root.PitfallDiscoveryRules={SITES,claim,rooms};
  if(typeof module!=='undefined')module.exports=root.PitfallDiscoveryRules;
})(typeof window!=='undefined'?window:globalThis);
