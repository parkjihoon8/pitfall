(function(root){
  'use strict';
  const KEYS=['pitfall-crafting-v1','pitfall-terrain-v2','pitfall-equipment-v1','pitfall-exploration-v1','pitfall-industry-v1','pitfall-health-v1','pitfall-dig-v1','pitfall-dig-v1-backup'];
  const clone=v=>JSON.parse(JSON.stringify(v));
  function validate(v){
    if(!v||v.version!==1||!v.keys||typeof v.keys!=='object'||Array.isArray(v.keys))throw Error('지원하지 않는 월드 저장입니다.');
    if(JSON.stringify(v).length>8*1024*1024)throw Error('저장 크기가 너무 큽니다.');
    for(const [k,value] of Object.entries(v.keys)){if(!KEYS.includes(k)||typeof value!=='string')throw Error('잘못된 저장 항목입니다.');const data=JSON.parse(value);if(data===null||typeof data!=='object'&&k!=='pitfall-health-v1')throw Error('잘못된 저장 데이터입니다.');}
    return clone(v);
  }
  function capture(storage){const keys={};for(const k of KEYS){const v=storage.getItem(k);if(v!==null)keys[k]=v;}return validate({version:1,createdAt:new Date().toISOString(),keys});}
  function backup(storage,id,snapshot){if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw Error('Invalid backup ID');const key='pitfall-backup-'+id,old=storage.getItem(key);if(old!==null)return old;const value=JSON.stringify(validate(snapshot));storage.setItem(key,value);if(storage.getItem(key)!==value)throw Error('백업 저장을 확인하지 못했습니다.');return value;}
  function newPlayer(){return {crafting:{slots:[null,null,null],selected:0,crafted:0},equipment:{pack:Array(6).fill(null),worn:true,boots:false,x:-7,y:0,z:10},exploration:{headlamp:false,headlampEquipped:false},health:100,position:{x:3.7,z:22,airY:0,yaw:.28,pitch:0}};}
  function split(snapshot){
    const v=validate(snapshot),read=(k,fallback)=>v.keys[k]===undefined?clone(fallback):JSON.parse(v.keys[k]);
    const crafting=read(KEYS[0],{version:1,slots:[null,null,null],selected:0,collected:[],drops:[]}),equipment=read(KEYS[2],{chest:Array(12).fill(null),pack:Array(6).fill(null),worn:true}),exploration=read(KEYS[3],{placed:[],harvested:[]});
    const player=newPlayer();for(const k of ['slots','selected','crafted']){if(k in crafting)player.crafting[k]=crafting[k];delete crafting[k];}
    const personalEquipment={...equipment};delete personalEquipment.chest;Object.assign(player.equipment,personalEquipment);
    for(const k of ['headlamp','headlampEquipped']){if(k in exploration)player.exploration[k]=exploration[k];delete exploration[k];}
    player.health=read(KEYS[5],100);
    return {world:{crafting,terrain:read(KEYS[1],null),equipment:{chest:equipment.chest||Array(12).fill(null)},exploration,industry:read(KEYS[4],null)},player};
  }
  function join(world,player){return {[KEYS[0]]:JSON.stringify({...clone(world.crafting),...clone(player.crafting)}),[KEYS[1]]:JSON.stringify(world.terrain),[KEYS[2]]:JSON.stringify({...clone(world.equipment),...clone(player.equipment)}),[KEYS[3]]:JSON.stringify({...clone(world.exploration),...clone(player.exploration)}),[KEYS[4]]:JSON.stringify(world.industry),[KEYS[5]]:JSON.stringify(player.health)};}
  root.PitfallWorldSave={KEYS,capture,validate,backup,split,join,newPlayer};if(typeof module!=='undefined')module.exports=root.PitfallWorldSave;
})(typeof window!=='undefined'?window:globalThis);
