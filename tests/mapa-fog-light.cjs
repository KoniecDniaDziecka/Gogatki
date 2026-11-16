const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../sources/mapa-podreczna/fog-light.js'), 'utf8');
const createFogLight = new Function(source + '\nreturn createFogLight;')();
const createMapModel = new Function(fs.readFileSync(path.join(__dirname, '../sources/mapa-podreczna/model.js'), 'utf8') + '\nreturn createMapModel;')();
let checks = 0;
const eq = (actual, expected, label) => {assert.deepEqual(actual, expected, label);checks++;};
function fixture() {
    const npcs = {};
    const page = {Engine:{hero:{d:{id:1,x:0,y:0}},map:{d:{id:1,x:32,y:32,pvp:2,visibility:4}},npcs:{check:()=>npcs,getById:id=>npcs[id]}}};
    const state = {enabled:true,mmShowMobs:true,mmShowNpcs:true};
    const model = createMapModel(page,state,{text:''},()=>{});
    const purges = [];
    const fog = createFogLight(page,()=>state.enabled,ids=>{purges.push(ids);parse({npcs_del:ids.map(id=>({id}))});});
    function parse(packet) {
        const processed = fog.before(packet);
        if(processed.town){Object.assign(page.Engine.map.d,processed.town);for(const id of Object.keys(npcs))delete npcs[id];}
        if(processed.h)Object.assign(page.Engine.hero.d,processed.h);
        const updates=Array.isArray(processed.npcs)?processed.npcs:Object.entries(processed.npcs||{}).map(([id,n])=>({...n,id:n.id??id}));
        for(const n of updates){if(n.del)delete npcs[n.id];else npcs[n.id]={d:{...npcs[n.id]?.d,...n}};}
        for(const entry of processed.npcs_del||[])delete npcs[typeof entry==='object'?entry.id:entry];
        model.feed(processed);fog.after(processed);return processed;
    }
    const ids = () => model.snapshot().objects.filter(object=>object.id.startsWith('n')).map(object=>object.id).sort();
    const add = (...entries) => parse({npcs:entries});
    const mob = (id,x=12,y=12,type=2) => ({id,x,y,type,nick:'Monster',lvl:10});
    return {page,state,fog,parse,purges,ids,add,mob,npcs};
}
{
    const f=fixture();f.add(f.mob(1),f.mob(2,1,1),f.mob(3,15,15,0),f.mob('echo-4'));
    const packet=Object.freeze({npcs_del:Object.freeze([{id:1},{id:2},{id:3},{id:'echo-4'}])});
    eq(f.parse(packet).npcs_del,[{id:2},{id:3},{id:'echo-4'}],'only distant monsters remain');
    eq(f.ids(),['n1'],'map cache preserves distant monster');
    eq(packet.npcs_del.length,4,'caller packet remains intact');
    f.parse({h:{x:12,y:12}});
    eq(f.ids(),[],'approaching an unconfirmed monster removes map marker');
    eq(f.purges,[['1']],'synthetic deletion is not retained recursively');
    eq(Object.keys(f.npcs),[],'native NPC state is cleaned');
}
{
    const f=fixture();f.add(f.mob(1));f.parse({npcs_del:[{id:1}]});
    f.parse({h:{x:12,y:12},npcs:[f.mob(1)]});
    eq(f.ids(),['n1'],'fresh monster survives approach');
    eq(f.purges,[],'no redundant deletion for fresh monster');
    f.parse({h:{x:0,y:0}});f.parse({npcs_del:[1]});
    f.state.enabled=false;f.fog.clear();
    eq(f.ids(),[],'disabling purges native and model ghosts');
    f.add(f.mob(2));f.parse({npcs_del:[{id:2}]});
    eq(f.ids(),[],'off setting leaves native deletion unchanged');
}
{
    const f=fixture();f.add(f.mob(1));f.parse({npcs_del:[{id:1}]});
    f.parse({h:{x:12,y:12},npcs:{1:f.mob(1)}});
    eq(f.ids(),['n1'],'dictionary NPC updates are supported');
    f.parse({h:{x:0,y:0}});f.parse({npcs_del:[{id:1}]});
    f.parse({town:{id:2,x:32,y:32,pvp:2,visibility:4},npcs:[f.mob(1)]});
    f.parse({h:{x:12,y:12}});
    eq(f.purges,[],'old map memory never removes a new map NPC with reused ID');
}
{
    const f=fixture();f.add(f.mob(1));f.page.Engine.map.d.pvp=0;f.parse({npcs_del:[{id:1}]});
    eq(f.ids(),[],'safe maps retain native deletion behavior');
    f.page.Engine.map.d.pvp=2;delete f.page.Engine.map.d.visibility;
    f.add(f.mob(2));f.parse({npcs_del:[{id:2}]});
    eq(f.ids(),[],'incomplete visibility data leaves deletion untouched');
}
{
    const f=fixture();f.add(f.mob(1));f.parse({npcs_del:[{id:1}]});
    f.page.Engine.map.d.id=2;f.fog.syncMap();f.fog.clear();
    eq(f.purges,[],'tick map changes clear memory without deleting new map NPCs');
}
console.log('PASS: '+checks+' Fog Light assertions for packet filtering, map cache, refresh, PvP, disable and map changes');
