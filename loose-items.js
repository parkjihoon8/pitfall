(function(root){
  function build({bag,pickups,density,items}){
    let clock=0,dirty=false;
    function keep(d){const index=bag.drops.findIndex(v=>v.key===d.key);if(index<0)bag.drops.push(d);else bag.drops[index]=d;}
    function merge(){const piles=[];for(const [key,obj] of pickups){const d=obj.userData.interaction.data;if(!obj.userData.resting)continue;let target=piles.find(t=>t.data.id===d.id&&t.data.count+d.count<=9999&&Math.hypot(t.data.x-d.x,t.data.z-d.z)<2&&Math.abs(t.data.y-d.y)<.15&&[.25,.5,.75].every(a=>density(d.x+(t.data.x-d.x)*a,d.y+.2,d.z+(t.data.z-d.z)*a)<=0));if(!target){piles.push({data:d,obj});continue;}target.data.count+=d.count;keep(target.data);bag.drops=bag.drops.filter(v=>v.key!==key);if(!bag.collected.includes(key))bag.collected.push(key);obj.removeFromParent();pickups.delete(key);dirty=true;}}
    function update(dt){const saved=new Map(bag.drops.map(d=>[d.key,d]));for(const [key,obj] of pickups){const d=saved.get(key)||obj.userData.interaction.data;obj.userData.interaction.data=d;let y=Number.isFinite(d.y)?d.y:0;const support=density(d.x,y-.02,d.z)>0;
        if(support){obj.userData.resting=true;obj.userData.fallSpeed=0;d.y=y;continue;}
        obj.userData.resting=false;const speed=(obj.userData.fallSpeed||0)+12*dt;obj.userData.fallSpeed=speed;const end=y-speed*dt,steps=Math.max(1,Math.ceil((y-end)/.05));
        for(let i=0;i<steps;i++){const next=y-(y-end)/(steps-i);if(density(d.x,next,d.z)>0){let high=y,low=next;for(let j=0;j<7;j++){const mid=(high+low)/2;if(density(d.x,mid,d.z)>0)low=mid;else high=mid;}y=high;obj.userData.resting=true;obj.userData.fallSpeed=0;break;}y=next;}
        d.y=y;obj.position.y=y+.05;keep(d);dirty=true;
      }clock+=dt;if(clock>=.4){clock=0;merge();const changed=dirty;dirty=false;return changed;}return false;}
    return {update,merge};
  }
  root.buildLooseItems=build;if(typeof module!=='undefined')module.exports=build;
})(typeof window!=='undefined'?window:globalThis);
