(function(root){
  'use strict';
  function create({renderer,devicePixelRatio=1,onChange=()=>{}}){
    let mode='quality',samples=[];
    function sample(ms){
      if(mode==='performance'||!Number.isFinite(ms)||ms<5||ms>100)return;
      samples.push(ms);if(samples.length<90)return;
      const sorted=samples.splice(0).sort((a,b)=>a-b),p90=sorted[Math.floor(sorted.length*.9)];
      if(p90<=24)return;
      mode='performance';renderer.shadowMap.enabled=false;renderer.setPixelRatio(Math.min(devicePixelRatio,.85));onChange(mode);
    }
    return {sample,status:()=>({mode,samples:samples.length})};
  }
  root.PitfallPerformance={create};
  if(typeof module!=='undefined')module.exports=root.PitfallPerformance;
})(typeof window!=='undefined'?window:globalThis);
