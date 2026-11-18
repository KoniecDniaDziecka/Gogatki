const config = {
  id:'greater-merchant',name:'Greater Merchant',niOnly:true,
  description:'Uzupełnia trzy kategorie w sklepie i ulepszaniu. Działa na NI.',
  defaults:{fillKey:'',sellKey:''},
  fields:[['fillKey','Skrót uzupełniania','text','maxlength="1"'],['sellKey','Skrót finalizacji sprzedaży','text','maxlength="1"']],
};
function run(R) {
  function fill() {
    if(!R.active)return;
    if(R.engine()?.shop)for(const button of [...document.querySelectorAll('.great-merchamp .button')].slice(0,3))button.click();
    if(R.engine()?.crafting?.enhancement)for(const button of [...document.querySelectorAll('.autofiller .button:not(.autofiller-config-btn)')].slice(0,3))button.click();
  }
  function sell(){if(R.active && R.engine()?.shop)document.querySelector('.finalize-button .button')?.click();}
  R.action('Uzupełnij',fill);R.action('Sprzedaj',sell);
  R.listen(document,'keydown',event=>{
    if(R.shortcut(event,R.state.fillKey)){event.preventDefault();fill();}
    else if(R.shortcut(event,R.state.sellKey)){event.preventDefault();sell();}
  });
  const craftingWindows=new WeakSet();
  return {tick(){
    R.hook(R.engine()?.shop,'greatMerchant',{before:call=>{
      if(!R.active)return;
      call.prevent=true;
      for(const category of [1,2,3])call.result=Reflect.apply(call.original,call.owner,[category]);
    }});
    const wnd=R.engine()?.crafting?.wndEl;
    if(wnd && !craftingWindows.has(wnd)) {
      craftingWindows.add(wnd);R.listen(wnd,'click',event=>{
        if(!R.active || !event.target.closest?.('.autofiller .button:not(.autofiller-config-btn)'))return;
        const filler=R.engine()?.crafting?.enhancement?.enchant?.autofiller;
        if(typeof filler?.autofillFrom==='function')for(const category of [1,2,3])filler.autofillFrom(category);
      });
    }
  }};
}
