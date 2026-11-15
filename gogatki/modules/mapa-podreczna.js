// Mapa podręczna+ 1.0.6 — enhancement of the native NI window.
GogatkiRuntime.register({
    id: 'mapa-podreczna',
    name: 'Mapa podręczna+',
    description: 'NI: oznaczenia, filtry i wyszukiwarka w istniejącej mapie podręcznej gry.',
    start() {
        'use strict';
        const window = unsafeWindow, document = window.document;
        const INSTANCE = '__gogatkiNativeMap', KEY = 'mapa-podreczna:global:v1';
        if (window.top !== window.self || window[INSTANCE]) return;
        if (!window.Engine) {
            if (typeof window.message === 'function') window.message('Mapa podręczna+ wymaga nowego interfejsu (NI).');
            return;
        }
        // Data collection/classification adapted from Dark-Sad Panel dodatków 6.1.5.
// Source: Sebastian00P/PanelDodatkow/script.js, blob e589b5b7ccb42279d2e9ff386777d6bb2631b86c.
// No replacement window or image rendering is retained.
function createMapModel(PAGE, state, search, onChange) {
 const anyHandlers=[],handlers=new Map();
 const net={onAny(fn){anyHandlers.push(fn);},on(key,fn){if(!handlers.has(key))handlers.set(key,[]);handlers.get(key).push(fn);},heroLvl(){const d=PAGE.Engine?.hero?.d||PAGE.hero||{};return Number(d.oplvl||d.lvl||0);}};
const COLORS = {
            hero: '#ff2a2a', other: '#ff3b3b', grave: '#ffffff', friend: '#08ad00', clan: '#08ad00', ally: '#9eff91', enemy: '#ff3b3b',
            npc: '#ddff00', mob: '#3a3a3a', elite: '#00ffe9', elite2: '#039689', elite3: '#ff9f1a',
            heros: '#ffd23f', herosEvent: '#ff4dd2', titan: '#b6ff1a', collosus: '#809912', item: '#f56bff', gw: '#2b3cff',
            resp: '#c6ba35', respEvent: '#00bfff', marker: '#ff00d4', party: '#b45cff',
        };

const TYPE_NAMES = {
            titan: 'tytan', collosus: 'kolos', heros: 'heros', herosEvent: 'heros eventowy', elite3: 'elita III', elite2: 'elita II', elite: 'elita',
            mob: 'potwór', npc: 'NPC', grave: 'grób', gw: 'przejście', item: 'przedmiot', resp: 'resp herosa', respEvent: 'resp (event)',
        };

const GW_ICONS = ['mas/exit-ith.gif', 'mas/exit-ith1.gif', 'mas/exit.gif', 'mas/drzwi.gif', 'obj/drzwi.gif', 'mas/exit-h64c.gif'];

const REL = { NONE: 1, FRIEND: 2, ENEMY: 3, CLAN: 4, CLAN_ALLY: 5, CLAN_ENEMY: 6, FRACTION_ALLY: 7, FRACTION_ENEMY: 8 };

let town = null;

const tpls = {};

const icons = {};

const npcs = {};

const graves = {};

const others = {};

let gws = [];

let spawns = [];

const checkedSpawns = new Set();

function engineMapFile() {
            try {
                const d = PAGE.Engine?.map?.d;
                return d?.file || d?.img || '';
            } catch (_) {
                return '';
            }
        }

function checkEngineMap() {
 const E=PAGE.Engine,d=E?.map?.d;
 if(d?.id!==undefined && (!town || String(town.id)!==String(d.id))) resetTown({...d,file:d.file||d.img||'',x:d.x||E.map.size?.x,y:d.y||E.map.size?.y});
}

function resetTown(t) {
 town={id:t.id,name:t.name||'',file:t.file||'',w:Number(t.x)||0,h:Number(t.y)||0,offset:t.backgroundOffset||null,visibility:Number(t.visibility)||0,pvp:t.pvp};
 for(const k in npcs) delete npcs[k]; for(const k in others) delete others[k]; for(const k in graves) delete graves[k];
 gws=[];spawns=[];checkedSpawns.clear();colStr='';colMapKey='';reachCache={key:'',set:null};lastGwBootstrap=0;
 if(search.coords){search.coords=null;search.text='';} onChange();
}

function npcLevel(tpl, n) {
            if (tpl && tpl.elasticLevelFactor !== undefined) {
                return Math.max(1, Math.min(300, net.heroLvl() + Number(tpl.elasticLevelFactor)));
            }
            return Number(tpl?.level ?? n.lvl ?? 0);
        }

function assembleNpc(n) {
            const tpl = tpls[n.tpl] || null;
            const out = { id: String(n.id) };
            const set = (k, v) => { if (v !== undefined && v !== null) out[k] = v; };
            set('x', n.x);
            set('y', n.y);
            set('nick', n.nick ?? tpl?.nick);
            set('type', tpl?.type ?? n.type);
            set('wt', tpl?.warrior_type ?? n.wt);
            if (tpl || n.lvl !== undefined) out.lvl = npcLevel(tpl, n);
            set('grp', n.group ?? n.grp);
            let icon = '';
            if (n.icon && typeof n.icon === 'object') icon = n.icon.special ?? icons[n.icon.id]?.icon ?? '';
            else if (typeof n.icon === 'string') icon = n.icon;
            else if (tpl?.icon) icon = tpl.icon;
            if (icon) out.icon = icon;
            set('quest', n.hasOnetimeQuest || n.hasDailyQuest || undefined);
            if (tpl?.isIconInvisible || n.isIconInvisible) out.invisible = true;
            if (tpl?.isHeroFromEvent || n.isHeroFromEvent) out.event = true;
            return out;
        }

let lastHeroLoc = null;

function parseSpawns(raw) {
            const out = [];
            const seen = new Set();
            const entries = Array.isArray(raw) ? raw : Object.values(raw || {});
            const toXY = (p) => {
                if (Array.isArray(p) && p.length >= 2) return [Number(p[0]), Number(p[1])];
                if (p && typeof p === 'object' && p.x !== undefined && p.y !== undefined) return [Number(p.x), Number(p.y)];
                return null;
            };
            for (const t of entries) {
                if (!t || typeof t !== 'object') continue;
                const event = /event/i.test(String(t.kind ?? t.type ?? ''));
                const name = t.name || t.nick || 'herosa';
                const lvl = t.lvl ?? t.level;
                let list = t.pos ?? t.positions ?? t.localizations ?? t.coords ?? t.spawns;
                if (list && !Array.isArray(list)) list = Object.values(list);
                if (!list) list = [t];
                // pojedyncza para [x,y] zamiast listy par
                if (list.length === 2 && list.every((v) => typeof v === 'number' || /^\d+$/.test(String(v)))) list = [list];
                for (const p of list) {
                    const xy = toXY(p);
                    if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) continue;
                    const key = `${xy[0]},${xy[1]}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    out.push({ x: xy[0], y: xy[1], nick: `Resp ${event ? 'eventowy ' : ''}${name}${lvl ? ` (${lvl} lvl)` : ''}`, kind: event ? 'respEvent' : 'resp' });
                }
            }
            return out;
        }

function mergeGateways(list) {
            const groups = [];
            for (const g of list) {
                const grp = groups.find((x) => x.nick === g.nick && x.items.some((i) => Math.abs(i.x - g.x) <= 1 && Math.abs(i.y - g.y) <= 1));
                if (grp) grp.items.push(g);
                else groups.push({ nick: g.nick, items: [g] });
            }
            return groups.map((grp, i) => {
                const xs = grp.items.map((t) => t.x);
                const ys = grp.items.map((t) => t.y);
                return {
                    id: `gw-${i}`, kind: 'gw', nick: grp.nick,
                    x: xs.reduce((a, b) => a + b, 0) / xs.length,
                    y: ys.reduce((a, b) => a + b, 0) / ys.length,
                    tx: grp.items[0].x, ty: grp.items[0].y,
                    spanX: Math.max(...xs) - Math.min(...xs) + 1,
                    spanY: Math.max(...ys) - Math.min(...ys) + 1,
                };
            });
        }

function gatewaysFromEngine() {
            const E = PAGE.Engine;
            if (!E) return [];
            const out = [];
            const strip = (t) => String(t || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const sources = [E.map?.gateways, E.gateways, E.map?.gw, E.map?.gws];
            for (const src of sources) {
                if (!src) continue;
                let list = null;
                try {
                    list = (typeof src.getList === 'function' && src.getList()) ||
                        (typeof src.getAll === 'function' && src.getAll()) ||
                        (typeof src.check === 'function' && src.check()) ||
                        src.list || src.gateways || src.gws || src.d || src;
                } catch (_) { list = null; }
                if (!list || typeof list !== 'object') continue;
                for (const key of Object.keys(list)) {
                    const g = list[key];
                    if (!g || typeof g !== 'object') continue;
                    const d = g.d && typeof g.d === 'object' ? g.d : g;
                    const x = Number(d.x ?? g.rx ?? g.x);
                    const y = Number(d.y ?? g.ry ?? g.y);
                    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
                    const name = strip(d.townname || d.name || g.name || g.townname ||
                        (typeof g.tip === 'string' ? g.tip : '') || (typeof d.tip === 'string' ? d.tip : '')) || 'Przejście';
                    out.push({ id: `gw-e-${key}`, x, y, nick: name, kind: 'gw' });
                }
                if (out.length) break;
            }
            return out;
        }

let lastGwBootstrap = 0;

function ensureGateways() {
            if (gws.length || Date.now() - lastGwBootstrap < 2000) return;
            lastGwBootstrap = Date.now();
            const list = gatewaysFromEngine();
            if (list.length) {
                gws = mergeGateways(list);

            }
        }

function bootstrapFromEngine() {
            const E = PAGE.Engine;
            if (!E) return;
            try { ensureGateways(); } catch (_) {}
            try {
                const d = E.map?.d;
                if (d && (!town || !town.w)) {
                    resetTown({ id: d.id, name: d.name, file: d.file || d.img || '', x: d.x || E.map.size?.x, y: d.y || E.map.size?.y, visibility: d.visibility, backgroundOffset: d.backgroundOffset });
                }
            } catch (_) {}
            try {
                if (!Object.keys(npcs).length && typeof E.npcs?.check === 'function') {
                    const list = E.npcs.check() || {};
                    for (const id in list) {
                        const d = list[id]?.d || list[id];
                        if (d && d.x !== undefined) npcs[String(d.id ?? id)] = { id: String(d.id ?? id), x: d.x, y: d.y, nick: d.nick, type: d.type, wt: d.wt, lvl: d.lvl, grp: d.grp, icon: d.icon };
                    }
                }
            } catch (_) {}
            try {
                if (!Object.keys(others).length && typeof E.others?.check === 'function') {
                    const list = E.others.check() || {};
                    for (const id in list) {
                        const d = list[id]?.d || list[id];
                        if (d && d.x !== undefined) others[String(d.id ?? id)] = Object.assign({ id: String(d.id ?? id) }, d);
                    }
                }
            } catch (_) {}
        }

let lastOthersPull = 0;

function refreshOthersFromEngine() {
            const now = Date.now();
            if (now - lastOthersPull < 1000) return;
            lastOthersPull = now;
            try {
                const E = PAGE.Engine;
                if (typeof E?.others?.check !== 'function') return;
                const list = E.others.check() || {};
                for (const id in list) {
                    const d = list[id]?.d || list[id];
                    if (d && d.x !== undefined) others[String(d.id ?? id)] = Object.assign({ id: String(d.id ?? id) }, d);
                }
            } catch (_) {}
        }

function npcKind(n) {
            if (n.invisible) return null;
            // groby graczy – rozpoznajemy po grafice albo nazwie
            if (/gr[oó]b|grave|tomb|nagrob|\brip\b/i.test(String(n.icon || '')) || /^\s*(gr[oó]b\b|[śs]\.?\s?p\.)/i.test(String(n.nick || ''))) return 'grave';
            const type = Number(n.type);
            const wt = Number(n.wt) || 0;
            if (type === 2 || type === 3) {
                if (wt > 99) return 'titan';
                if (wt >= 90) return 'collosus';
                if (wt > 79) return n.event ? 'herosEvent' : 'heros';
                if (wt > 29) return 'elite3';
                if (wt > 19) return 'elite2';
                if (wt > 9) return 'elite';
                return 'mob';
            }
            if (type === 0 || type === 5 || type === 6) {
                if (wt > 29 && wt < 80) return 'elite3';
                if (wt > 9 && wt < 20) return 'elite';
                if (n.icon && GW_ICONS.some((g) => String(n.icon).includes(g))) return 'gw';
                if (!n.nick || !String(n.nick).trim()) return null;   // dekoracje / obiekty bez nazwy
                return 'npc';
            }
            if (type === 7) return 'item';
            return null;
        }

const partyIds = new Set();

function inMyParty(id) {
            if (id === undefined || id === null) return false;
            if (partyIds.size) return partyIds.has(String(id));
            try {
                const m = PAGE.Engine?.party?.getMembers?.();
                return Boolean(m && (m[id] || Object.values(m).some((x) => String(x?.id ?? x?.d?.id) === String(id))));
            } catch (_) {
                return false;
            }
        }

function otherKind(o) {
            if (inMyParty(o.id)) return 'party';
            // gra bywa, że podaje relację tekstem („fr”, „cl”, „en”, „cl-en”…) zamiast liczbą
            const rel = String(o.relation ?? '').toLowerCase();
            if (rel && isNaN(Number(rel))) {
                if (/en/.test(rel)) return 'enemy';
                if (rel === 'cl') return 'clan';
                if (rel === 'fr') return 'friend';
                if (/cl|fr/.test(rel)) return 'ally';
                return 'other';
            }
            switch (Number(o.relation)) {
                case REL.FRIEND: return 'friend';
                case REL.CLAN: return 'clan';
                case REL.CLAN_ALLY:
                case REL.FRACTION_ALLY: return 'ally';
                case REL.ENEMY:
                case REL.CLAN_ENEMY:
                case REL.FRACTION_ENEMY: return 'enemy';
                default: return 'other';
            }
        }

const SUSPECT_RANGE = 3;

function suspectSpawn(sp) {
            const h = heroPos();
            const myRange = Math.max(1, Number(state.mmSpawnRange) || 10);
            if (h && Math.hypot(sp.x - (h.x ?? h.rx), sp.y - (h.y ?? h.ry)) <= myRange) return sp;
            for (const id in npcs) {
                const n = npcs[id];
                const k = n.x !== undefined ? npcKind(n) : null;
                if ((k === 'heros' || k === 'herosEvent') && Math.hypot(n.x - sp.x, n.y - sp.y) <= 8) return sp;
            }
            const near = [];
            for (const id in others) {
                const o = others[id];
                if (o.x === undefined || o.y === undefined) continue;
                if (Math.hypot(Number(o.x) - sp.x, Number(o.y) - sp.y) <= SUSPECT_RANGE) near.push(o.nick || '?');
            }
            if (!near.length) return sp;
            return Object.assign({}, sp, { suspect: near });
        }

function collectObjects() {
            const list = [];
            for (const g of gws) list.push(g);
            if (state.mmShowSpawns) for (const s of spawns) list.push(suspectSpawn(s));
            for (const id in npcs) {
                const n = npcs[id];
                if (n.x === undefined || n.y === undefined) continue;
                const kind = npcKind(n);
                if (!kind) continue;
                if (kind === 'gw' && gws.some((g) => Math.abs(g.x - n.x) <= 1.5 && Math.abs(g.y - n.y) <= 1.5)) continue;
                if (kind === 'mob' && !state.mmShowMobs) continue;
                if (kind === 'npc' && !state.mmShowNpcs) continue;
                list.push({ id: `n${id}`, x: n.x, y: n.y, nick: n.nick || '', lvl: n.lvl, grp: n.grp, kind });
            }
            const nowSec = Date.now() / 1000;
            for (const id in graves) {
                const g = graves[id];
                if (g.expires && nowSec > g.expires) { delete graves[id]; continue; }
                if (list.some((o) => o.kind === 'grave' && Math.abs(o.x - g.x) < 1 && Math.abs(o.y - g.y) < 1)) continue;
                list.push({ id: `g${id}`, x: g.x, y: g.y, nick: g.nick, lvl: g.lvl, kind: 'grave' });
            }
            if (state.mmShowOthers) {
                if (!Object.keys(others).length) refreshOthersFromEngine();
                for (const id in others) {
                    const o = others[id];
                    if (o.x === undefined || o.y === undefined) continue;
                    list.push({
                        id: `o${id}`, x: o.x, y: o.y, nick: o.nick || '', lvl: o.lvl, prof: o.prof,
                        clan: typeof o.clan === 'object' ? o.clan?.name : '', kind: otherKind(o), player: true,
                    });
                }
            }
            if (search.temp && Date.now() > search.temp) search = { text: search.text, coords: null };
            if (search.coords) list.push({ id: 'marker', x: search.coords[0], y: search.coords[1], nick: `Koordy ${search.coords[0]},${search.coords[1]}`, kind: 'marker' });
            return list;
        }

function matchesSearch(obj) {
            if (!search.text || obj.kind === 'marker') return true;
            const q = search.text;
            return `${obj.nick} ${obj.clan || ''} ${TYPE_NAMES[obj.kind] || ''}`.toLowerCase().includes(q);
        }

function heroPos() {
            const h = PAGE.Engine?.hero;
            if (h) {
                return {
                    x: h.d?.x ?? h.x, y: h.d?.y ?? h.y,
                    rx: Number.isFinite(h.rx) ? h.rx : h.d?.x, ry: Number.isFinite(h.ry) ? h.ry : h.d?.y,
                };
            }
            const o = PAGE.hero;
            return o ? { x: o.x, y: o.y, rx: o.x, ry: o.y } : null;
        }

function getPlayers() {
            if (!Object.keys(others).length) refreshOthersFromEngine();
            const h = heroPos();
            const out = [];
            for (const id in others) {
                const o = others[id];
                if (o.x === undefined || o.y === undefined) continue;
                const kind = otherKind(o);
                const dist = h ? Math.hypot(o.x - h.x, o.y - h.y) : 999;
                const clan = typeof o.clan === 'object' && o.clan ? (o.clan.name || '') : (typeof o.clan === 'string' ? o.clan : '');
                out.push({ id: String(id), nick: o.nick || '?', x: Number(o.x), y: Number(o.y), lvl: o.lvl, prof: o.prof || '', clan, kind, dist, hostile: kind === 'enemy' || kind === 'other' });
            }
            return out.sort((a, b) => a.dist - b.dist);
        }

let colStr = '';

let colMapKey = '';

let reachCache = { key: '', set: null };

function decodeCollisions(enc) {
            const out = [];
            for (let i = 0; i < enc.length; i++) {
                let c = enc.charCodeAt(i);
                if (c > 95 && c < 123) {
                    for (let k = 95; k < c; k++) out.push('000000');
                } else {
                    c -= 32;
                    let b = '';
                    for (let k = 0; k < 6; k++) b += (c & (1 << k)) ? '1' : '0';
                    out.push(b);
                }
            }
            return out.join('');
        }

function collisionFn() {
            const w = town?.w || Number(PAGE.Engine?.map?.size?.x) || 0;
            const h = town?.h || Number(PAGE.Engine?.map?.size?.y) || 0;
            if (!w || !h) return null;
            if (colStr && colStr.length >= w * h && (!town || !colMapKey || colMapKey === String(town.id))) {
                return (x, y) => colStr[x + y * w] === '1';
            }
            try {
                const col = PAGE.Engine?.map?.col;
                if (col && typeof col.check === 'function') return (x, y) => Boolean(col.check(x, y));
                const str = typeof col === 'string' ? col : (typeof col?.c === 'string' ? col.c : '');
                if (str && str.length >= w * h) return (x, y) => str[x + y * w] === '1';
            } catch (_) {}
            try {
                const old = PAGE.map?.col;
                if (typeof old === 'string' && old.length >= w * h) return (x, y) => old[x + y * w] === '1';
            } catch (_) {}
            return null;
        }

function reachableSet() {
            const h = heroPos();
            const w = town?.w || Number(PAGE.Engine?.map?.size?.x) || 0;
            const hh = town?.h || Number(PAGE.Engine?.map?.size?.y) || 0;
            if (!h || !w || !hh) return null;
            const isCol = collisionFn();
            if (!isCol) return null;
            const sx = Math.round(Number(h.x));
            const sy = Math.round(Number(h.y));
            // w trakcie ładowania / teleportu pozycja bywa pusta (NaN) albo z poprzedniej mapy –
            // wtedy BFS kręciłby się w nieskończoność i zawieszał przeglądarkę
            if (!Number.isInteger(sx) || !Number.isInteger(sy) || sx < 0 || sy < 0 || sx >= w || sy >= hh) return null;
            const key = `${town?.id}|${sx},${sy}|${colStr.length}`;
            if (reachCache.key === key) return reachCache.set;
            const seen = new Uint8Array(w * hh);
            const q = [sx + sy * w];
            seen[q[0]] = 1;
            const limit = w * hh;
            for (let qi = 0; qi < q.length && qi <= limit; qi++) {
                const i = q[qi];
                const x = i % w;
                const y = (i - x) / w;
                const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                for (const [nx, ny] of nb) {
                    if (nx < 0 || ny < 0 || nx >= w || ny >= hh) continue;
                    const ni = nx + ny * w;
                    if (seen[ni]) continue;
                    if (isCol(nx, ny)) {
                        seen[ni] = 2;         // ściana sąsiadująca z dostępnym terenem (np. przejście w ścianie)
                        continue;
                    }
                    seen[ni] = 1;
                    q.push(ni);
                }
            }
            reachCache = { key, set: { seen, w } };
            return reachCache.set;
        }

function gateReachable(g, reach) {
            if (!reach) return true;
            const { seen, w } = reach;
            const at = (x, y) => (x >= 0 && y >= 0 && x < w ? seen[x + y * w] : 0);
            return at(g.x, g.y) > 0;
        }

function getGateways() {
            const h = heroPos();
            return gws.map((g) => {
                const x = Number(g.tx ?? g.x);
                const y = Number(g.ty ?? g.y);
                return { id: g.id, nick: g.nick || 'Przejście', x, y, dist: h ? Math.hypot(x - h.x, y - h.y) : 999 };
            }).sort((a, b) => String(a.nick).localeCompare(String(b.nick), 'pl', { sensitivity: 'base', numeric: true }) || a.x - b.x || a.y - b.y);
        }

function queueRender() { onChange(); }
net.onAny((data) => {
            let changed = false;
            if (data.town && typeof data.town === 'object') {
                const t = data.town;
                const newMap = t.file !== undefined ||
                    (t.id !== undefined && town && String(t.id) !== String(town.id)) ||
                    (t.name !== undefined && town && t.name !== town.name) ||
                    (t.x !== undefined && t.y !== undefined && (!town || Number(t.x) !== town.w || Number(t.y) !== town.h));
                if (newMap) {
                    resetTown(Object.assign({}, t, { file: t.file ?? engineMapFile() }));
                } else if (town && data.town.visibility !== undefined) {
                    town.visibility = Number(data.town.visibility) || 0;
                }
                if (town && data.town.pvp !== undefined) town.pvp = data.town.pvp;
                changed = true;
            }
            if (Array.isArray(data.icons)) for (const i of data.icons) icons[i.id] = i;
            if (Array.isArray(data.npc_tpls)) for (const t of data.npc_tpls) tpls[t.id] = t;
            if (Array.isArray(data.npcs)) {
                for (const n of data.npcs) {
                    if (n.del) { delete npcs[String(n.id)]; continue; }
                    const a = assembleNpc(n);
                    npcs[a.id] = Object.assign(npcs[a.id] || {}, a);
                }
                changed = true;
            } else if (data.npcs && typeof data.npcs === 'object') {
                for (const id in data.npcs) {
                    const n = Object.assign({ id }, data.npcs[id]);
                    if (n.del) delete npcs[id];
                    else npcs[id] = Object.assign(npcs[id] || {}, assembleNpc(n));
                }
                changed = true;
            }
            // groby graczy – pakiet „rip”: płaska lista, po 9 pól na grób:
            // nick, lvl, oplvl, prof, x, y, ts (czas śmierci), opis1 („Zabity przez…”), opis2 (epitafium).
            // Grób znika z gry 5 minut po śmierci.
            if (Array.isArray(data.rip) && data.rip.length && typeof data.rip[0] !== 'object') {
                const r = data.rip;
                for (let i = 0; i + 8 < r.length; i += 9) {
                    const x = parseInt(r[i + 4], 10);
                    const y = parseInt(r[i + 5], 10);
                    const ts = parseInt(r[i + 6], 10) || Math.floor(Date.now() / 1000);
                    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
                    const id = `${r[i]}-${x}-${y}-${ts}`;
                    graves[id] = {
                        x, y, lvl: r[i + 1],
                        nick: `Ś.p. ${r[i]}${r[i + 1] ? ` (${r[i + 1]}${r[i + 3] || ''})` : ''}${r[i + 7] ? ` – ${r[i + 7]}` : ''}`,
                        expires: ts + 300,
                    };
                }
                changed = true;
            }
            // inne możliwe formaty (lista obiektów albo słownik id -> grób)
            for (const key of ['rip', 'rips', 'graves', 'grave']) {
                const g = data[key];
                if (!g || typeof g !== 'object') continue;
                if (Array.isArray(g) && g.length && typeof g[0] !== 'object') continue;
                const entries = Array.isArray(g) ? g.map((v, i) => [v?.id ?? i, v]) : Object.entries(g);
                for (const [gid, v] of entries) {
                    if (!v || typeof v !== 'object') continue;
                    const id = String(v.id ?? gid);
                    if (v.del) { delete graves[id]; continue; }
                    const x = Number(v.x);
                    const y = Number(v.y);
                    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
                    const who = v.nick ?? v.n ?? v.name ?? '';
                    graves[id] = { x, y, nick: who ? `Ś.p. ${who}` : 'Grób', lvl: v.lvl };
                }
                changed = true;
            }
            if (Array.isArray(data.npcs_del)) {
                for (const n of data.npcs_del) delete npcs[String(n && typeof n === 'object' ? n.id : n)];
                changed = true;
            }
            if (data.other && typeof data.other === 'object') {
                for (const id in data.other) {
                    const o = data.other[id];
                    if (!o) continue;
                    if (o.del) delete others[id];
                    else if (others[id]) Object.assign(others[id], o);
                    else if (o.nick !== undefined) others[id] = Object.assign({ id }, o);
                }
                changed = true;
            }
            if (Array.isArray(data.gw2) && data.townname) {
                gws = [];
                const g = data.gw2;
                for (let i = 0; i + 2 < g.length; i += 5) {
                    let name = data.townname[g[i]] || 'Przejście';
                    if (Number(g[i + 3]) === 2) name += ' (wymaga klucza)';
                    if (g[i + 4]) {
                        const v = parseInt(g[i + 4], 10);
                        const min = v & 65535;
                        const max = (v >> 16) & 65535;
                        name += ` (${min ? `od ${min}` : ''}${max && max < 1000 ? ` do ${max}` : ''} lvl)`;
                    }
                    gws.push({ id: `gw-${i}`, x: Number(g[i + 1]), y: Number(g[i + 2]), nick: name, kind: 'gw' });
                }
                gws = mergeGateways(gws);
                changed = true;
            }
            const hh = data.handheld_minimap;
            if (hh && hh.hero_localizations) {
                lastHeroLoc = hh.hero_localizations;
                spawns = parseSpawns(hh.hero_localizations);
                changed = true;
            }
            if (changed) queueRender();
        });

net.on('party', (party) => {
            if (!party || typeof party !== 'object') return;
            const members = party.members;
            if (members && typeof members === 'object') {
                partyIds.clear();
                for (const k in members) partyIds.add(String(members[k]?.id ?? k));
            } else if (!Object.keys(party).length) partyIds.clear();
        });

net.on('cl', (cl) => {
            if (typeof cl !== 'string') return;
            colStr = decodeCollisions(cl);
            colMapKey = town ? String(town.id) : '';
            reachCache.key = '';

        });

 function snapshot(){
  checkEngineMap(); bootstrapFromEngine(); ensureGateways(); refreshOthersFromEngine();
  const h=heroPos();
  if(h)for(const sp of spawns)if(Math.hypot(sp.x-h.x,sp.y-h.y)<=Math.max(1,Number(state.mmSpawnRange)||10))checkedSpawns.add(sp.x+','+sp.y);
  const reach=state.mmGwAvail?reachableSet():null;
  return {town,hero:h,colors:COLORS,names:TYPE_NAMES,objects:collectObjects().filter(matchesSearch).map(o=>({...o,checked:checkedSpawns.has(o.x+','+o.y)})),players:getPlayers(),gateways:getGateways().filter(g=>gateReachable(g,reach)),collisionKnown:!!reach};
 }
 return {snapshot,heroPosition:heroPos,feed(data){if(!data||typeof data!=='object')return;for(const fn of anyHandlers)fn(data);for(const [key,list]of handlers)if(data[key]!==undefined)for(const fn of list)fn(data[key],data);}};

}

        const MAP_MARKER_CSS = "/* Marker styles adapted from Dark-Sad Panel dodatków 6.1.5; isolated in Shadow DOM. */\n:host { all: initial; pointer-events: none; }\n* { box-sizing: border-box; pointer-events: none; }\n.pa-mm-objects { position: absolute; inset: 0; pointer-events: none; }\n.pa-mm-obj {\n  position: absolute;\n  left: 0;\n  top: 0;\n  will-change: transform;\n  border-radius: 50%;\n  box-shadow: 0 0 0 1px rgba(0,0,0,.55);\n  pointer-events: none;\n}\n.pa-mm-obj.pa-mm-anim { transition: transform .45s linear; }\n.pa-mm-obj.pa-mm-grave { box-shadow: 0 0 0 1.5px #000, 0 0 4px rgba(0,0,0,.8); }\n.pa-mm-obj.pa-mm-mob { background: transparent !important; box-shadow: 0 0 0 1px rgba(255,255,255,.85), 0 0 0 2px rgba(0,0,0,.5); }\n.pa-mm-obj.pa-mm-gw { border-radius: 3px; box-shadow: 0 0 0 1px rgba(255,255,255,.35); }\n.pa-mm-obj.pa-mm-player { box-shadow: 0 0 0 1px rgba(0,0,0,.8); }\n.pa-mm-obj.pa-mm-pulse {\n  overflow: visible;\n  box-shadow: 0 0 0 2px #000, 0 0 10px 2px currentColor;\n  animation: pa-mm-glow .9s ease-in-out infinite;\n}\n.pa-mm-obj.pa-mm-pulse::before, .pa-mm-obj.pa-mm-pulse::after {\n  content: '';\n  position: absolute;\n  inset: -2px;\n  border: 2px solid currentColor;\n  border-radius: 50%;\n  animation: pa-mm-ring 1.6s ease-out infinite;\n  pointer-events: none;\n}\n.pa-mm-obj.pa-mm-pulse::after { animation-delay: .8s; }\n@keyframes pa-mm-ring { 0% { transform: scale(1); opacity: .95; } 100% { transform: scale(3.4); opacity: 0; } }\n.pa-mm-obj.pa-mm-resp, .pa-mm-obj.pa-mm-respEvent { background: transparent !important; border: 2px solid #c6ba35; box-shadow: none; }\n.pa-mm-obj.pa-mm-respEvent { border-color: #00bfff; }\n.pa-mm-obj.pa-mm-resp.pa-mm-near {\n  border: 3px solid #fff36b;\n  background: rgba(255, 236, 80, .45) !important;\n  box-shadow: 0 0 0 1px #000, 0 0 10px 3px rgba(255, 236, 80, .8);\n  z-index: 150 !important;\n}\n/* resp, przy którym stoi inny gracz – wygląda jak heros (może tam być) */\n.pa-mm-obj.pa-mm-resp.pa-mm-suspect, .pa-mm-obj.pa-mm-respEvent.pa-mm-suspect {\n  border: 0 !important; background: #ffd23f !important; color: #ffd23f !important;\n  box-shadow: 0 0 0 1.5px #000, 0 0 10px 3px rgba(255,210,63,.75); z-index: 160 !important;\n}\n.pa-mm-obj.pa-mm-respEvent.pa-mm-suspect { background: #ff4dd2 !important; color: #ff4dd2 !important; box-shadow: 0 0 0 1.5px #000, 0 0 10px 3px rgba(255,77,210,.75); }\n.pa-mm-obj.pa-mm-marker { animation: pa-mm-flash .5s steps(2) infinite; border-radius: 3px; }\n@keyframes pa-mm-flash { 50% { filter: invert(1); } }\n@keyframes pa-mm-glow { 50% { box-shadow: 0 0 0 2px #fff, 0 0 18px 6px currentColor; filter: brightness(1.2); } }\n.pa-mm-hero {\n  position: absolute;\n  z-index: 300;\n  left: 0;\n  top: 0;\n  border-radius: 2px;\n  background: #ff2a2a;\n  box-shadow: 0 0 0 1.5px #fff, 0 0 8px rgba(255,42,42,.9);\n  pointer-events: none;\n  will-change: transform;\n}\n.pa-mm-view {\n  position: absolute;\n  z-index: 250;\n  left: 0;\n  top: 0;\n  border: 1px solid rgba(255,230,90,.9);\n  border-radius: 3px;\n  background: rgba(255,230,90,.06);\n  box-sizing: border-box;\n  pointer-events: none;\n  will-change: transform;\n}\n";
        const MARKER_LAYERS = { gw: 70, item: 80, grave: 85, resp: 90, respEvent: 90, npc: 110, mob: 110,
            elite: 120, elite2: 130, elite3: 130, other: 140, friend: 140, clan: 140, ally: 140,
            party: 142, enemy: 145, titan: 150, collosus: 150, heros: 160, herosEvent: 160, marker: 200 };
        const PULSE = new Set(['titan', 'collosus', 'heros', 'herosEvent', 'elite3']);

        const defaults = { mmShowMobs: true, mmShowNpcs: true, mmShowOthers: true, mmShowSpawns: true,
            mmSpawnRange: 10, mmGwAvail: false, fog: true, attack: false, drawer: false };
        let saved;
        try { saved = GM_getValue(KEY, {}); } catch { saved = {}; }
        const state = { ...defaults };
        for (const key of Object.keys(defaults)) if (typeof defaults[key] === 'boolean' && typeof saved?.[key] === 'boolean') state[key] = saved[key];
        const search = { text: '', coords: null };
        let binding = null, disposed = false, command = null, timer = null, hooked = null, snapshot = null;
        let heroFrame = null;
        let hint = '', warned = false;
        const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
        const model = createMapModel(window, state, search, () => {});
        const heroTransforms = new WeakMap();
        function save() { try { GM_setValue(KEY, { ...state }); } catch { showStatus('Nie udało się zapisać ustawień.'); } }
        function showStatus(text) { hint = text; if (binding) setText(binding.status, text); }
        function isVisible(node) {
            if (!node?.isConnected || !node.getClientRects().length) return false;
            for (let el = node; el && el !== document.body; el = el.parentElement) {
                const css = window.getComputedStyle(el);
                if (css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse') return false;
            }
            return true;
        }
        function findWindow() {
            const windows = [...document.querySelectorAll('.c-window.handheld-window, .border-window.handheld-window')];
            if (!windows.length) for (const node of document.querySelectorAll('.c-window, .border-window')) {
                const title = node.querySelector('.header-label .text')?.textContent || '';
                if (/mapa podr[eę]czna|podr[eę]czna mapa/i.test(title)) windows.push(node);
            }
            return windows.find(isVisible) || null;
        }
        function contentRect(surface) {
            const r = surface.getBoundingClientRect(), css = window.getComputedStyle(surface);
            const sx = r.width / (surface.offsetWidth || r.width), sy = r.height / (surface.offsetHeight || r.height);
            const left = (parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft) || 0) * sx;
            const right = (parseFloat(css.borderRightWidth) + parseFloat(css.paddingRight) || 0) * sx;
            const top = (parseFloat(css.borderTopWidth) + parseFloat(css.paddingTop) || 0) * sy;
            const bottom = (parseFloat(css.borderBottomWidth) + parseFloat(css.paddingBottom) || 0) * sy;
            return { left: r.left + left, top: r.top + top, width: r.width - left - right, height: r.height - top - bottom };
        }
        function findSurface(native, town) {
            if (!(town?.w > 0 && town?.h > 0)) return null;
            const ratio = town.w / town.h;
            const nodes = [...native.querySelectorAll('canvas, img, .handheld-map, .handheld-minimap')];
            // NI can expose the map as a CSS image rather than an <img>/canvas.
            if (town.file) for (const node of native.querySelectorAll('.content *, .inner-content *, .window-content *')) {
                if (!nodes.includes(node) && window.getComputedStyle(node).backgroundImage.includes(town.file)) nodes.push(node);
            }
            const candidates = nodes.filter(node => {
                if (node.closest('[data-gogatki-map-ui]') || !isVisible(node)) return false;
                if (!/^(CANVAS|IMG)$/.test(node.tagName) && window.getComputedStyle(node).backgroundImage === 'none') return false;
                const r = contentRect(node);
                return r.width >= 64 && r.height >= 64 && Math.abs(r.width / r.height / ratio - 1) < 0.04;
            });
            return candidates.sort((a, b) => {
                const score = node => {
                    const r = contentRect(node);
                    const source = node.currentSrc || node.src || '';
                    return r.width * r.height + (town.file && source.includes(town.file) ? 1e9 : 0);
                };
                return score(b) - score(a);
            })[0] || null;
        }
        function backgroundSource(town) {
            const image = window.Engine?.map?.img;
            const source = image?.currentSrc || image?.src;
            if (source && (!town.file || source.startsWith('data:image/') || source.includes(town.file))) return { source, image };
            if (!town.file) return null;
            try {
                const cfg = window.CFG || {};
                const base = new URL(cfg.a_mpath || cfg.mpath || '/obrazki/miasta/', document.baseURI);
                return { source: new URL(town.file, base).href, image: null };
            } catch { return null; }
        }
        function releaseBackground() {
            const background = binding?.background;
            if (background?.owned) { background.image.onload = null; background.image.onerror = null; }
            if (binding) binding.background = null;
        }
        function prepareBackground() {
            const source = backgroundSource(snapshot.town);
            if (!source) { releaseBackground(); return false; }
            const key = `${snapshot.town.id}|${source.source}`;
            const ready = source.image?.complete && source.image.naturalWidth > 0;
            if (binding.background?.key !== key || (ready && !binding.background.ready)) {
                releaseBackground();
                const image = ready ? source.image : new window.Image();
                const background = { key, source: source.source, image, owned: !ready, ready, failed: false };
                binding.background = background;
                if (!ready) {
                    image.onload = () => { background.ready = image.naturalWidth > 0; };
                    image.onerror = () => { background.failed = true; };
                    image.src = source.source;
                }
            }
            const background = binding.background;
            if (!background.ready) return false;
            const town = snapshot.town, image = background.image;
            const tilesW = image.naturalWidth / 32, tilesH = image.naturalHeight / 32;
            let offset = town.offset || window.Engine?.map?.d?.backgroundOffset || window.Engine?.map?.backgroundOffset;
            if (!offset && (tilesW > town.w + 0.5 || tilesH > town.h + 0.5)) {
                offset = { x: Math.max(0, (tilesW - town.w) / 2), y: Math.max(0, (tilesH - town.h) / 2) };
            }
            setAttribute(binding.terrain, 'href', background.source);
            setAttribute(binding.terrain, 'x', offset ? -Number(offset.x || 0) : 0);
            setAttribute(binding.terrain, 'y', offset ? -Number(offset.y || 0) : 0);
            setAttribute(binding.terrain, 'width', offset ? tilesW : town.w);
            setAttribute(binding.terrain, 'height', offset ? tilesH : town.h);
            return true;
        }
        function hook() {
            const comm = window.Engine?.communication;
            if (typeof comm?.parseJSON !== 'function') return;
            if (hooked?.comm === comm) return;
            unhook();
            const original = comm.parseJSON;
            function wrapper(data) {
                try { return original.apply(this, arguments); }
                finally {
                    if (!disposed) try { model.feed(typeof data === 'string' ? JSON.parse(data) : data); }
                    catch (error) { if (!warned) { warned = true; console.warn('[Mapa podręczna+] Dane mapy:', error); } }
                }
            }
            comm.parseJSON = wrapper;
            hooked = { comm, original, wrapper };
        }
        function unhook() {
            if (hooked && hooked.comm.parseJSON === hooked.wrapper) hooked.comm.parseJSON = hooked.original;
            hooked = null;
        }
        function goTo(x, y) {
            if (!snapshot?.town || !Number.isFinite(x) || !Number.isFinite(y)) return;
            x = Math.max(0, Math.min(snapshot.town.w - 1, Math.round(x)));
            y = Math.max(0, Math.min(snapshot.town.h - 1, Math.round(y)));
            if (typeof window.Engine?.hero?.autoGoTo === 'function') window.Engine.hero.autoGoTo({ x, y });
            else showStatus('Gra nie udostępnia teraz wyznaczania drogi.');
        }
        function stopCommand(text = '') { command = null; showStatus(text); }
        function commandStep() {
            if (!command || !snapshot?.hero || !binding?.surface || !isVisible(binding.native)) return;
            if (String(snapshot.town?.id) !== command.map) { stopCommand('Zmieniono mapę — zakończono podążanie.'); return; }
            const now = Date.now();
            if (command.kind === 'gate' && now - command.start > 90000) { stopCommand('Nie udało się dojść do przejścia.'); return; }
            let target = command;
            if (command.kind === 'player') {
                target = snapshot.players.find(player => player.id === command.id);
                if (!target) { stopCommand('Gracz zniknął z mapy.'); return; }
                const near = Math.max(Math.abs(snapshot.hero.x - target.x), Math.abs(snapshot.hero.y - target.y)) <= 1;
                if (near) {
                    if (state.attack && now - command.lastAttack >= 1200 && typeof window._g === 'function') {
                        command.lastAttack = now;
                        window._g(`fight&a=attack&id=${encodeURIComponent(command.id)}`);
                    }
                    return;
                }
            } else if (snapshot.hero.x === target.x && snapshot.hero.y === target.y) {
                if (!command.arrived) command.arrived = now;
                if (now - command.arrived > 3000 && now - command.sent > 3000 && command.tries < 3 && typeof window._g === 'function') {
                    command.sent = now; command.tries++; window._g('walk');
                }
                if (now - command.start > 90000) stopCommand('Zakończono oczekiwanie na przejście.');
                return;
            }
            if (now - command.sent < 1500) return;
            command.sent = now;
            const dx = command.kind === 'player' ? Math.sign(snapshot.hero.x - target.x) || 1 : 0;
            goTo(target.x + dx, target.y);
        }
        function act(kind, object) {
            if (kind === 'go') { stopCommand(); goTo(object.tx ?? object.x, object.ty ?? object.y); }
            if (kind === 'chase') {
                const id = String(object.id).replace(/^o/, '');
                if (command?.id === id) { stopCommand('Zatrzymano pościg.'); return; }
                command = { kind: 'player', id, map: String(snapshot.town.id), sent: 0, lastAttack: 0 };
                showStatus(`Podążanie za: ${object.nick}`); commandStep();
            }
            if (kind === 'gate') {
                command = { kind: 'gate', x: object.tx ?? object.x, y: object.ty ?? object.y, map: String(snapshot.town.id), start: Date.now(), sent: 0, arrived: 0, tries: 0 };
                showStatus(`Przejście: ${object.nick}`); commandStep();
            }
            if (kind === 'eq') {
                const id = String(object.id).replace(/^o/, '');
                const player = window.Engine?.others?.getById?.(id);
                if (typeof window.Engine?.showEqManager?.getEqData === 'function') window.Engine.showEqManager.getEqData({ ...object, ...(player?.d || player || {}), id: Number(id) || id });
                else showStatus('Gra nie udostępnia teraz podglądu ekwipunku.');
            }
            if (kind === 'copy') {
                const text = `${object.nick} na mapie ${snapshot.town.name} (${object.x},${object.y})`;
                Promise.resolve().then(() => window.navigator.clipboard.writeText(text)).then(() => showStatus('Skopiowano opis celu.'), () => showStatus('Nie udało się zapisać do schowka.'));
            }
        }
        function mount(native) {
            const host = document.createElement('div');
            host.dataset.gogatkiMapUi = '';
            host.style.cssText = 'position:absolute;right:26px;top:2px;width:20px;height:20px;z-index:100002;';
            const root = host.attachShadow({ mode: 'open' });
            root.innerHTML = `<style>
                :host{all:initial;font:12px Arial,sans-serif;color:#c7d0d9}*{box-sizing:border-box;font:inherit;text-shadow:none}
                [hidden]{display:none!important}button,input{color:#c7d0d9;background:#252b31;border:1px solid #668298;border-radius:3px}
                button{cursor:pointer;padding:3px 5px}button:focus-visible,input:focus-visible{outline:2px solid #12c9bd;outline-offset:1px}
                .toggle{display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:2px;border:0;background:transparent;color:#12c9bd}.toggle:hover{background:#38566c}
                svg{width:16px;height:16px;pointer-events:none}.drawer{position:absolute;right:var(--gmp-drawer-right,0px);top:calc(100% + 4px);width:var(--gmp-drawer-width,230px);max-width:calc(100vw - 16px);max-height:var(--gmp-height,300px);overflow:auto;background:#171b20;border:1px solid #668298;border-radius:4px;padding:7px}
                input[type=search]{width:100%;padding:4px;margin-bottom:5px}.options{display:grid;grid-template-columns:1fr 1fr;gap:5px}
                label{display:flex;gap:5px;align-items:center;font-size:11px}input[type=checkbox]{appearance:none;display:grid;place-content:center;width:14px;height:14px;min-width:14px;margin:0}
                input[type=checkbox]::before,input[type=checkbox]::after{content:none}input:checked::after{content:'✓';color:#12c9bd;font:12px/12px Arial}
                .status{font-size:11px;color:#b1c0cb;margin:6px 0;overflow-wrap:anywhere}.entry{border-top:1px solid #384651;padding:5px 0}.name{font-size:11px;overflow-wrap:anywhere}.actions{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}.actions button{font-size:11px;background:#38566c}.coords{color:#b1c0cb;font-size:11px;margin-top:2px}
            </style><button type="button" class="toggle" aria-label="Ustawienia mapy+" aria-expanded="false" title="Ustawienia mapy+"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg></button>
            <section class="drawer" aria-label="Rozszerzenia mapy podręcznej" hidden><input type="search" placeholder="Nazwa lub x,y" aria-label="Szukaj na mapie"><div class="options"></div><p class="status" role="status"></p><button type="button" class="stop" hidden>Zatrzymaj podążanie</button><div class="list"></div></section>`;
            const drawer = root.querySelector('.drawer'), toggle = root.querySelector('.toggle');
            drawer.hidden = !state.drawer; toggle.setAttribute('aria-expanded', String(state.drawer));
            const options = [['mmShowMobs', 'Moby'], ['mmShowNpcs', 'NPC'], ['mmShowOthers', 'Gracze'], ['mmShowSpawns', 'Respy'], ['fog', 'Zasięg widzenia'], ['mmGwAvail', 'Dostępne przejścia'], ['attack', 'Atakuj w pościgu']];
            for (const [key, title] of options) {
                const label = document.createElement('label'), input = document.createElement('input');
                input.type = 'checkbox'; input.checked = state[key]; input.dataset.option = key;
                input.addEventListener('change', () => { state[key] = input.checked; save(); });
                label.append(input, document.createTextNode(title)); root.querySelector('.options').append(label);
            }
            toggle.addEventListener('click', event => { event.stopPropagation(); state.drawer = !state.drawer; drawer.hidden = !state.drawer; toggle.setAttribute('aria-expanded', String(state.drawer)); save(); });
            // Clicking the title-bar control must not start dragging the native window.
            for (const type of ['pointerdown', 'mousedown', 'dblclick']) host.addEventListener(type, event => event.stopPropagation());
            const input = root.querySelector('input[type=search]');
            input.value = search.coords ? search.coords.join(',') : search.text;
            input.addEventListener('input', () => {
                const value = input.value.trim(), coords = value.match(/^(\d+)\s*[,; ]\s*(\d+)$/);
                search.text = coords ? '' : value.toLowerCase(); search.coords = coords ? [Number(coords[1]), Number(coords[2])] : null;
                if (search.coords && snapshot?.town && (search.coords[0] >= snapshot.town.w || search.coords[1] >= snapshot.town.h)) { search.coords = null; showStatus('Współrzędne poza tą mapą.'); }
                else showStatus('');
            });
            for (const type of ['keydown', 'keyup', 'keypress']) host.addEventListener(type, event => {
                if (event.composedPath().some(node => /^(INPUT|BUTTON)$/.test(node?.tagName))) event.stopPropagation();
            });
            root.querySelector('.stop').addEventListener('click', () => stopCommand('Zatrzymano podążanie.'));
            const isolation = { value: native.style.getPropertyValue('isolation'), priority: native.style.getPropertyPriority('isolation') };
            native.style.setProperty('isolation', 'isolate');
            native.append(host);
            const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            overlay.dataset.gogatkiMapLayer = ''; overlay.setAttribute('aria-hidden', 'true');
            overlay.setAttribute('preserveAspectRatio', 'none');
            overlay.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden;z-index:100000;display:none;';
            // Native markers can be painted into the same canvas as the terrain.
            // Cover that composite with clean terrain before drawing our markers;
            // the native canvas and its event handlers remain underneath.
            const backdrop = document.createElementNS(overlay.namespaceURI, 'rect');
            backdrop.setAttribute('width', '100%'); backdrop.setAttribute('height', '100%'); backdrop.setAttribute('fill', '#000');
            backdrop.dataset.gogatkiMapBackdrop = '';
            const terrain = document.createElementNS(overlay.namespaceURI, 'image');
            terrain.dataset.gogatkiMapTerrain = ''; terrain.setAttribute('preserveAspectRatio', 'none');
            overlay.append(backdrop, terrain);
            native.append(overlay);
            const markerHost = document.createElement('div');
            markerHost.dataset.gogatkiMapMarkers = '';
            markerHost.setAttribute('aria-hidden', 'true');
            markerHost.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden;z-index:100001;display:none;';
            const markerRoot = markerHost.attachShadow({ mode: 'open' });
            const markerStyle = document.createElement('style'); markerStyle.textContent = MAP_MARKER_CSS;
            const markerLayer = document.createElement('div'); markerLayer.className = 'pa-mm-objects';
            markerRoot.append(markerStyle, markerLayer); native.append(markerHost);
            return { native, host, root, drawer, input, status: root.querySelector('.status'), list: root.querySelector('.list'), overlay, terrain, markerHost, markerLayer, markerGeometry: '', background: null, isolation, surface: null, marks: new Map(), rows: new Map(), rect: null, map: String(snapshot?.town?.id) };
        }
        function placeControls() {
            const { native, host } = binding, frame = native.getBoundingClientRect();
            const sx = frame.width / (native.offsetWidth || frame.width), sy = frame.height / (native.offsetHeight || frame.height);
            const css = window.getComputedStyle(native), borderX = parseFloat(css.borderLeftWidth) || 0, borderY = parseFloat(css.borderTopWidth) || 0;
            const close = native.querySelector('.close-button-corner-decor .close-button, .close-button');
            const closeRect = close && isVisible(close) ? close.getBoundingClientRect() : null;
            const header = native.querySelector('.header-label-positioner, .header-label, header');
            const hr = header?.getBoundingClientRect();
            const size = Math.min(20, Math.max(14, closeRect ? closeRect.height / sy : (hr?.height / sy || 24) - 4));
            const width = size * sx, height = size * sy;
            const center = closeRect ? (closeRect.top + closeRect.bottom) / 2 : (hr?.height ? (hr.top + hr.bottom) / 2 : frame.top + 14 * sy);
            const top = center - height / 2;
            const occupied = [];
            const title = native.querySelector('.header-label .text, .header-label-positioner .text');
            if (title) {
                const range = document.createRange(); range.selectNodeContents(title);
                const textRect = range.getBoundingClientRect();
                if (textRect.width) occupied.push(textRect);
            }
            for (const control of native.querySelectorAll('button, [role=button], a, [class*="button"], .icon')) {
                if (control.closest('[data-gogatki-map-ui]') || !isVisible(control)) continue;
                const rect = control.getBoundingClientRect();
                if (rect.top < top + height && rect.bottom > top) occupied.push(rect);
            }
            const right = closeRect ? closeRect.left - 4 * sx : frame.right - 6 * sx;
            let left = right - width;
            for (let x = left; x >= frame.left + 4 * sx; x -= 2 * sx) {
                if (occupied.every(rect => x + width + 2 * sx <= rect.left || x >= rect.right + 2 * sx)) { left = x; break; }
            }
            const cssLeft = (left - frame.left) / sx - borderX;
            const contentWidth = native.clientWidth;
            Object.assign(host.style, { left: cssLeft + 'px', right: 'auto', top: ((top - frame.top) / sy - borderY) + 'px', width: size + 'px', height: size + 'px' });
            host.style.setProperty('--gmp-drawer-width', Math.max(120, Math.min(230, contentWidth - 16)) + 'px');
            host.style.setProperty('--gmp-drawer-right', (cssLeft + size - (contentWidth - 8)) + 'px');
        }
        function unmount() {
            stopHeroAnimation();
            if (!binding) return;
            binding.surface?.removeEventListener('pointermove', hover);
            binding.surface?.removeEventListener('pointerleave', leave);
            releaseBackground();
            if (binding.native.style.getPropertyValue('isolation') === 'isolate') {
                if (binding.isolation.value) binding.native.style.setProperty('isolation', binding.isolation.value, binding.isolation.priority);
                else binding.native.style.removeProperty('isolation');
            }
            binding.host.remove(); binding.overlay.remove(); binding.markerHost.remove(); binding = null;
            stopCommand();
        }
        function hover(event) {
            const r = binding?.rect, town = snapshot?.town;
            if (!r || !town) return;
            const x = Math.floor((event.clientX - r.left) / r.width * town.w), y = Math.floor((event.clientY - r.top) / r.height * town.h);
            if (x < 0 || y < 0 || x >= town.w || y >= town.h) return;
            const near = snapshot.objects.filter(o => Math.hypot(o.x - x, o.y - y) <= 1.5).slice(0, 3).map(o => o.nick).join(' · ');
            showStatus(`(${x},${y})${near ? ' — ' + near : ''}`);
        }
        function leave() { showStatus(''); }
        function setAttribute(node, key, value) { value = String(value); if (node.getAttribute(key) !== value) node.setAttribute(key, value); }
        function stopHeroAnimation() {
            if (heroFrame !== null) window.cancelAnimationFrame(heroFrame);
            heroFrame = null;
        }
        function renderHeroPosition() {
            const geometry = binding?.heroGeometry;
            if (!geometry || !binding.native.isConnected || !binding.surface?.isConnected || binding.native.style.display === 'none' || binding.markerHost.style.display === 'none') return false;
            const marker = binding.marks.get('self'), view = binding.marks.get('view');
            // Read live draw coordinates each frame; a snapshot taken by the
            // 200 ms data/UI timer would still make the marker jump between tiles.
            const hero = model.heroPosition(), x = Number(hero?.rx), y = Number(hero?.ry);
            if (!hero || !Number.isFinite(x) || !Number.isFinite(y) || String(window.Engine?.map?.d?.id) !== geometry.map) {
                if (marker) marker.style.display = 'none';
                if (view) view.style.display = 'none';
                return false;
            }
            const position = (node, left, top) => {
                if (!node) return;
                if (node.style.display) node.style.display = '';
                const transform = `translate(${left.toFixed(2)}px,${top.toFixed(2)}px)`;
                if (heroTransforms.get(node) !== transform) { node.style.transform = transform; heroTransforms.set(node, transform); }
            };
            position(marker, (x + 0.5) * geometry.scaleX - geometry.heroSize / 2, (y + 0.5) * geometry.scaleY - geometry.heroSize / 2);
            if (state.fog) position(view, (x - geometry.visibility) * geometry.scaleX, (y - geometry.visibility) * geometry.scaleY);
            else if (view) view.style.display = 'none';
            return Boolean(marker);
        }
        function animateHero() {
            heroFrame = null;
            if (disposed) return;
            try { if (renderHeroPosition()) heroFrame = window.requestAnimationFrame(animateHero); }
            catch (error) { if (!warned) { warned = true; console.warn('[Mapa podręczna+] Pozycja postaci:', error); } }
        }
        function startHeroAnimation() {
            if (heroFrame === null && renderHeroPosition()) heroFrame = window.requestAnimationFrame(animateHero);
        }
        function renderLayer(objects) {
            const { overlay, markerHost, markerLayer, marks, rect, native } = binding, town = snapshot.town;
            const nr = native.getBoundingClientRect(), sx = nr.width / (native.offsetWidth || nr.width), sy = nr.height / (native.offsetHeight || nr.height);
            const ncss = window.getComputedStyle(native);
            const geometry = { left: ((rect.left - nr.left) / sx - (parseFloat(ncss.borderLeftWidth) || 0)) + 'px', top: ((rect.top - nr.top) / sy - (parseFloat(ncss.borderTopWidth) || 0)) + 'px', width: rect.width / sx + 'px', height: rect.height / sy + 'px' };
            Object.assign(overlay.style, geometry); Object.assign(markerHost.style, geometry);
            setAttribute(overlay, 'viewBox', `0 0 ${town.w} ${town.h}`);
            let clip = { left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height };
            for (let parent = binding.surface.parentElement; parent; parent = parent.parentElement) {
                const css = window.getComputedStyle(parent), r = parent.getBoundingClientRect();
                if (/(hidden|clip|auto|scroll)/.test(css.overflowX)) { clip.left = Math.max(clip.left, r.left); clip.right = Math.min(clip.right, r.right); }
                if (/(hidden|clip|auto|scroll)/.test(css.overflowY)) { clip.top = Math.max(clip.top, r.top); clip.bottom = Math.min(clip.bottom, r.bottom); }
                if (parent === native) break;
            }
            overlay.style.clipPath = `inset(${Math.max(0, clip.top - rect.top) / sy}px ${Math.max(0, rect.left + rect.width - clip.right) / sx}px ${Math.max(0, rect.top + rect.height - clip.bottom) / sy}px ${Math.max(0, clip.left - rect.left) / sx}px)`;
            markerHost.style.clipPath = overlay.style.clipPath;
            const scaleX = rect.width / sx / town.w, scaleY = rect.height / sy / town.h;
            const dotSize = Math.max(7, Math.round(scaleX));
            const heroSize = Math.max(5, Math.round(dotSize * 0.7));
            binding.heroGeometry = { scaleX, scaleY, heroSize, visibility: town.visibility, map: String(town.id) };
            const geometryKey = `${town.id}:${geometry.width}:${geometry.height}`;
            const resized = geometryKey !== binding.markerGeometry;
            binding.markerGeometry = geometryKey;
            const desired = new Set();
            const hero = snapshot.hero;
            const shapes = objects.map(o => ({ ...o, key: o.id || `${o.kind}:${o.x},${o.y}` }));
            if (hero && Number.isFinite(Number(hero.rx)) && Number.isFinite(Number(hero.ry))) shapes.push({ key: 'self', kind: 'hero', x: Number(hero.rx), y: Number(hero.ry) });
            if (state.fog && hero && town.visibility > 0) shapes.push({ key: 'view', kind: 'view', x: Number(hero.rx) - town.visibility, y: Number(hero.ry) - town.visibility, size: 2 * town.visibility + 1 });
            for (const o of shapes) {
                if (!Number.isFinite(Number(o.x)) || !Number.isFinite(Number(o.y))) continue;
                desired.add(o.key);
                let mark = marks.get(o.key);
                const fresh = !mark;
                if (fresh) { mark = document.createElement('div'); mark.dataset.kind = o.kind; markerLayer.append(mark); marks.set(o.key, mark); }
                const special = o.kind === 'hero' || o.kind === 'view';
                const pulse = PULSE.has(o.kind) || Boolean(o.suspect);
                const animate = !special && !fresh && !resized;
                const classes = special ? `pa-mm-${o.kind}` : `pa-mm-obj pa-mm-${o.kind}${o.player ? ' pa-mm-player' : ''}${pulse ? ' pa-mm-pulse' : ''}${o.suspect ? ' pa-mm-suspect' : ''}${o.kind === 'resp' && o.checked ? ' pa-mm-near' : ''}${animate ? ' pa-mm-anim' : ''}`;
                if (mark.className !== classes) mark.className = classes;
                let width, height, left, top;
                if (o.kind === 'view') {
                    width = o.size * scaleX; height = o.size * scaleY; left = o.x * scaleX; top = o.y * scaleY;
                } else {
                    const size = o.kind === 'hero' ? heroSize : (pulse || o.kind === 'elite2' ? Math.round(dotSize * 1.5) : dotSize);
                    width = o.spanX ? Math.max(dotSize, o.spanX * scaleX) : size;
                    height = o.spanY ? Math.max(dotSize, o.spanY * scaleY) : size;
                    left = (Number(o.x) + 0.5) * scaleX - width / 2;
                    top = (Number(o.y) + 0.5) * scaleY - height / 2;
                }
                mark.style.width = width + 'px'; mark.style.height = height + 'px';
                mark.style.transform = `translate(${left.toFixed(2)}px,${top.toFixed(2)}px)`;
                if (!special) { mark.style.background = snapshot.colors[o.kind] || '#fff'; mark.style.color = snapshot.colors[o.kind] || '#fff'; mark.style.zIndex = String(MARKER_LAYERS[o.kind] || 100); }
                if (!special && (fresh || resized)) window.requestAnimationFrame(() => { if (mark.isConnected) mark.classList.add('pa-mm-anim'); });
            }
            for (const [key, mark] of marks) if (!desired.has(key)) { mark.remove(); marks.delete(key); }
            startHeroAnimation();
        }
        function renderRows(objects) {
            const rank = o => ({ titan: 1, collosus: 2, herosEvent: 3, heros: 4, elite3: 5, elite2: 6, enemy: 7, gw: 8, marker: 0 }[o.kind] ?? 20);
            const list = [...objects].sort((a, b) => rank(a) - rank(b) || String(a.nick).localeCompare(String(b.nick), 'pl')).slice(0, 80), wanted = new Set();
            for (const [index, o] of list.entries()) {
                const key = o.id || `${o.kind}:${o.x},${o.y}`; wanted.add(key);
                let row = binding.rows.get(key);
                if (!row) {
                    const element = document.createElement('div'); element.className = 'entry';
                    const name = document.createElement('div'); name.className = 'name';
                    const coords = document.createElement('div'); coords.className = 'coords';
                    const actions = document.createElement('div'); actions.className = 'actions';
                    row = { element, name, coords, object: o }; element.append(name, coords, actions);
                    const add = (kind, title) => { const button = document.createElement('button'); button.type = 'button'; button.dataset.action = kind; button.textContent = title; button.addEventListener('click', () => act(kind, row.object)); actions.append(button); };
                    add(o.kind === 'gw' ? 'gate' : 'go', o.kind === 'gw' ? 'Przejdź' : 'Podejdź');
                    if (o.player) { add('chase', 'Goń'); add('eq', 'Ekwipunek'); }
                    if (/heros|titan|collosus/.test(o.kind)) add('copy', 'Kopiuj');
                    binding.rows.set(key, row);
                }
                row.object = o;
                setText(row.name, `${o.nick || snapshot.names[o.kind] || 'Cel'}${o.lvl ? ' · ' + o.lvl + (o.prof || '') : ''}`);
                row.name.style.color = snapshot.colors[o.kind] || '#c7d0d9';
                setText(row.coords, `(${Math.round(o.x)},${Math.round(o.y)}) · ${snapshot.names[o.kind] || (o.player ? 'gracz' : '')}${o.suspect ? ' · ktoś stoi przy respie' : ''}`);
                if (binding.list.children[index] !== row.element) binding.list.insertBefore(row.element, binding.list.children[index] || null);
            }
            for (const [key, row] of binding.rows) if (!wanted.has(key)) { row.element.remove(); binding.rows.delete(key); }
            binding.root.querySelector('.stop').hidden = !command;
        }
        function tick() {
            if (disposed) return;
            hook(); snapshot = model.snapshot();
            const native = findWindow();
            if (native !== binding?.native) { unmount(); if (native) binding = mount(native); }
            if (!binding) return;
            placeControls();
            if (binding.map !== String(snapshot.town?.id)) { binding.map = String(snapshot.town?.id); binding.input.value = search.text; }
            binding.host.style.setProperty('--gmp-height', Math.max(90, native.offsetHeight - 90) + 'px');
            const surface = findSurface(native, snapshot.town);
            if (surface !== binding.surface) {
                binding.surface?.removeEventListener('pointermove', hover); binding.surface?.removeEventListener('pointerleave', leave);
                binding.surface = surface;
                surface?.addEventListener('pointermove', hover, { passive: true }); surface?.addEventListener('pointerleave', leave, { passive: true });
            }
            const backgroundReady = surface && prepareBackground();
            binding.overlay.style.display = backgroundReady ? '' : 'none';
            binding.markerHost.style.display = backgroundReady ? '' : 'none';
            if (!surface) { stopHeroAnimation(); stopCommand(); showStatus('Nie rozpoznano obszaru mapy. Natywna mapa działa bez zmian.'); return; }
            if (!backgroundReady) {
                stopHeroAnimation();
                stopCommand();
                showStatus(!binding.background || binding.background.failed ? 'Nie udało się odczytać tła — pokazuję mapę gry bez dodatku.' : 'Wczytywanie czystego tła mapy…');
                return;
            }
            if (['Wczytywanie czystego tła mapy…', 'Nie udało się odczytać tła — pokazuję mapę gry bez dodatku.', 'Nie rozpoznano obszaru mapy. Natywna mapa działa bez zmian.'].includes(hint)) hint = '';
            binding.rect = contentRect(surface);
            if (search.coords && (!snapshot.town || search.coords[0] >= snapshot.town.w || search.coords[1] >= snapshot.town.h)) { search.coords = null; showStatus('Współrzędne poza tą mapą.'); }
            const allowedGates = new Set(snapshot.gateways.map(g => g.id));
            const objects = snapshot.objects.filter(o => !state.mmGwAvail || o.kind !== 'gw' || !String(o.id || '').startsWith('gw-') || allowedGates.has(o.id));
            renderLayer(objects); renderRows(objects); commandStep();
            if (!hint) setText(binding.status, state.mmGwAvail && !snapshot.collisionKnown ? 'Brak danych kolizji — pokazuję wszystkie przejścia.' : `${snapshot.town.name || 'Mapa'} · oznaczenia: ${objects.length}`);
        }
        function destroy(event) {
            if (event?.persisted) return;
            if (disposed) return; disposed = true;
            window.clearInterval(timer); unmount(); unhook();
            window.removeEventListener('pagehide', destroy);
            if (window[INSTANCE]?.destroy === destroy) delete window[INSTANCE];
        }
        window[INSTANCE] = { destroy };
        window.addEventListener('pagehide', destroy);
        try { tick(); } catch (error) { destroy(); throw error; }
        timer = window.setInterval(() => {
            try { tick(); } catch (error) { if (!warned) { warned = true; console.warn('[Mapa podręczna+]', error); } }
        }, 200);
    }
});
