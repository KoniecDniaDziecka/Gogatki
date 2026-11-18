const config = {
  id:'blogo-plus',name:'Błogo+',description:'Przypomina o kończącym się błogosławieństwie i pozwala błogosławić pobliskich graczy.',
  defaults:{renewCrimsonBuff:true,blessKey:''},
  fields:[['renewCrimsonBuff','Przedłuż karmazynowe błogosławieństwo'],['blessKey','Skrót „Pobłogosław”','text','maxlength="1"']],
};
function run(R) {
  let waiting = null, asking = false;
  const seen = new Map();
  const worn = items => Object.values(items || {}).find(item => Number(item.st)===10);
  const send = query => R.request(query).catch(error => R.report(error.message));
  async function bless() {
    if(!R.active || !R.hero()?.vip)return R.report('Błogosławienie graczy wymaga statusu premium.');
    const others = R.engine() ? Object.values(R.engine().others?.check?.() || {}).map(other=>other.d) : Object.values(window.g?.other || {});
    for (const other of others) {
      if(!R.active)break;
      if(![3,6,8].includes(Number(other.relation)) && Math.max(Math.abs(other.x-R.hero().x),Math.abs(other.y-R.hero().y))<=1) await send('emo&a=bless&id='+encodeURIComponent(other.id));
    }
  }
  async function reminder() {
    if(!R.active || !waiting || asking || R.inBattle())return;
    asking=true;const buff=waiting;waiting=null;
    const renew = await R.ask('Zaraz skończy Ci się błogosławieństwo! Czy chcesz je odnowić?', [['Odnów',true],['Pomiń',false]]);
    asking=false;
    if(!renew || !R.active)return;
    const next=R.playerItems().find(item=>item.name===buff.name && Number(item.st)===0);
    if(next) await send('moveitem&st=1&id='+encodeURIComponent(next.id));
    else R.message('Nie masz więcej użyć danego błogosławieństwa');
  }
  R.packets('after',packet=>{
    if(!R.active || asking || !packet.item)return;
    const buff=worn(packet.item);
    if(!buff || Number(R.stats(buff).ttl)!==1 || (!R.state.renewCrimsonBuff && buff.name==='Karmazynowe błogosławieństwo'))return;
    const id=String(buff.id);if((seen.get(id)||0)>Date.now())return;
    seen.set(id,Date.now()+75000);waiting=buff;void reminder();
  });
  R.packets('before',packet=>{
    const ask=packet.ask;
    if(R.active && String(ask?.q || '').includes('Karmazynowe błogosławieństwo') && !worn(R.playerItems()) && typeof ask.re==='string') {
      delete packet.ask;void send(ask.re+'1');
    }
  });
  R.menu(menu=>{
    const label=window._t?.('emo_mad',null,'menu');
    if(R.hero()?.vip && Array.isArray(menu) && label && menu.some(entry=>entry[0]===label))menu.unshift(['Pobłogosław',bless]);
  });
  R.action('Pobłogosław',bless);
  R.listen(document,'keydown',event=>{if(R.shortcut(event,R.state.blessKey)){event.preventDefault();void bless();}});
  return {tick(){void reminder();for(const [id,time] of seen)if(time<=Date.now())seen.delete(id);},change(){if(!R.active)waiting=null;}};
}
