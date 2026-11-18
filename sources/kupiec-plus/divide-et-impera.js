const config = {
  id:'divide-et-impera',name:'Divide Et Impera',description:'Dzieli stosy: /2 na pół, /N na N części, 10*3+5 na podane porcje. Shift: pół, Ctrl: pojedynczo.',
  defaults:{itemId:'',expression:'/2'},fields:[['itemId','ID przedmiotu','text'],['expression','Podział stosu','text']],
};
function run(R) {
  let busy=false, splitContext=null;
  function plan(value,total) {
    const text=String(value).replace(/\s+/g,'').toLowerCase().replace(/(\d+)([kmg])/g,(_,n,s)=>String(Number(n)*({k:1e3,m:1e6,g:1e9}[s])));
    if(!Number.isSafeInteger(total)||total<2)throw Error('Stos musi zawierać co najmniej 2 przedmioty.');
    let parts;
    if(/^\/\d+$/.test(text)) {
      const times=Number(text.slice(1));parts=[{amount:Math.floor(total/times),times}];
    } else if(/^\d+(?:[+*]\d+)*$/.test(text)) {
      parts=text.split('+').map(term=>{const [amount,...factors]=term.split('*').map(Number);return {amount,times:factors.reduce((a,b)=>a*b,1)};});
    } else throw Error('Nieprawidłowy podział. Przykłady: /2, /10, 10*3+5.');
    if(parts.some(p=>!Number.isSafeInteger(p.amount)||!Number.isSafeInteger(p.times)||p.amount<1||p.times<1))throw Error('Wszystkie porcje muszą być dodatnimi liczbami całkowitymi.');
    if(parts.reduce((sum,p)=>sum+p.amount*p.times,0)>total)throw Error('Nie posiadasz takiej ilości przedmiotów.');
    return parts;
  }
  async function split(item,value,total) {
    if(busy || !R.active)return;
    busy=true;
    try {
      total=Number(total ?? R.stats(item).amount ?? R.stats(item).ammo);
      const parts=plan(value,total);
      let remaining=total;
      for(const part of parts)for(let n=0;n<part.times;n++) {
        if(!R.active)return;
        if(part.amount>=remaining)continue; // Ostatnia pozostała porcja już istnieje w stosie.
        const packet=await R.request('moveitem&st=0&id='+encodeURIComponent(item.id)+'&x='+Number(item.x)+'&y='+Number(item.y)+'&findslot=1&split='+part.amount);
        if(!packet.item)throw Error('Gra nie potwierdziła podziału. Sprawdź wolne miejsce w torbie.');
        remaining-=part.amount;
      }
      R.report('Podział stosu zakończony.');
    } catch(error){R.report(error.message);} finally {busy=false;}
  }
  const byId=id=>R.items()[id] || R.engine()?.items?.getItemById?.(id);
  function fromQuery(query){try{return new URLSearchParams(String(query)).get('id');}catch{return null;}}
  function quick(event) {
    if(!R.active || (!event.shiftKey&&!event.ctrlKey))return false;
    const item=R.itemAt(event);if(!item)return false;
    const total=Number(R.stats(item).amount || R.stats(item).ammo);if(!(total>1))return false;
    event.preventDefault?.();event.stopImmediatePropagation?.();void split(item,event.ctrlKey?'/'+total:'/2',total);return true;
  }
  R.listen(document,'contextmenu',quick,true);
  R.menu((menu,event,call)=>{if(event && quick(event)){menu.splice(0);call.prevent=true;}});
  R.action('Podziel stos',()=>{
    const item=byId(R.state.itemId);if(!item)return R.report('Nie znaleziono przedmiotu o tym ID.');
    return split(item,R.state.expression);
  });
  return {tick(){
    const equipment=R.engine()?.heroEquipment;
    R.hook(equipment,'alertWindow',{before:call=>{splitContext={total:Number(call.args[0]),query:call.args[1]};}});
    R.hook(equipment,'checkValue',{before:call=>{
      if(!R.active)return;const item=byId(fromQuery(call.args[2]));if(!item)return;
      call.prevent=true;void split(item,call.args[0],call.args[1]);
    }});
    R.hook(window,'setOnlyPositiveNumberInInputWithLetter',{before:call=>{
      if(R.active && (call.args[0]?.is?.('#divide-items') || call.args[0]?.id==='divide-items'))call.prevent=true;
    }});
    R.hook(window,'mAlert',{before:call=>{
      if(!R.active)return;
      if(!R.engine() && window.g?.split) {
        const splitData=window.g.split;
        const text=window._t?.('item_split %max%',{'%max%':splitData[3]-1},'item');
        if(text && String(call.args[0]).startsWith(text)) {
          const item=byId(splitData[0]);if(!item)return;delete window.g.split;
          call.args=[call.args[0],3,[()=>void split(item,document.querySelector('input[name="mAlertInput"]')?.value,splitData[3]),()=>{}]];
        }
      } else if(splitContext && Array.isArray(call.args[1])) {
        const text=window._t?.('item_split %max%',{'%max%':splitContext.total-1},'item');
        if(text && String(call.args[0]).startsWith(text)) {
          const {total,query}=splitContext,item=byId(fromQuery(query));if(!item)return;
          call.args[1]=call.args[1].map((option,index)=>index?option:{...option,callback:()=>{
            const value=document.querySelector('#divide-items')?.value;
            if(value){void split(item,value,total);return true;}
          }});
        }
      }
    }});
  }};
}
