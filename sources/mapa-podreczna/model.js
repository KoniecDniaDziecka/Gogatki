// Data collection/classification adapted from Dark-Sad Panel dodatków 6.1.5.
// Source: Sebastian00P/PanelDodatkow/script.js, blob e589b5b7ccb42279d2e9ff386777d6bb2631b86c.
// No replacement window or image rendering is retained.
function createMapModel(PAGE, state, search, onChange) {
 const anyHandlers=[],handlers=new Map();
 const net={onAny(fn){anyHandlers.push(fn);},on(key,fn){if(!handlers.has(key))handlers.set(key,[]);handlers.get(key).push(fn);},heroLvl(){const d=PAGE.Engine?.hero?.d||PAGE.hero||{};return Number(d.oplvl||d.lvl||0);}};
const COLORS = {
            hero: '#87fdff', other: '#ffffff', grave: '#101010', friend: '#46a31d', clan: '#4cfa4f', ally: '#ffba37', enemy: '#c71618', clanEnemy: '#fc3e40',
            npc: '#ffff33', mob: '#9da1a7', elite: '#87fdff', elite2: '#38b8eb', elite3: '#ffba37',
            heros: '#ff00ff', herosEvent: '#ff00ff', titan: '#244bff', collosus: '#a500fc', item: '#f5a6f5', gw: '#244bff',
            resp: '#ffba37', respEvent: '#ffba37', marker: '#ff00d4', party: '#b45cff',
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
 if(d?.id===undefined) return;
 if(!town || String(town.id)!==String(d.id)) resetTown({...d,file:d.file||d.img||'',x:d.x||E.map.size?.x,y:d.y||E.map.size?.y});
 else {
  // Engine can expose its map dimensions after the initial map object.
  // Refresh missing fields without clearing already collected objects.
  if(!town.w) town.w=Number(d.x||E.map.size?.x)||0;
  if(!town.h) town.h=Number(d.y||E.map.size?.y)||0;
  if(!town.file) town.file=d.file||d.img||'';
 }
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
                const kinds = { fr: 'friend', friend: 'friend', cl: 'clan', clan: 'clan', en: 'enemy', enemy: 'enemy',
                    clen: 'clanEnemy', clanenemy: 'clanEnemy', enemyclan: 'clanEnemy', clfr: 'ally', clanfriend: 'ally', clanally: 'ally',
                    factionfriend: 'ally', fractionfriend: 'ally', factionally: 'ally', fractionally: 'ally',
                    factionenemy: 'enemy', fractionenemy: 'enemy' };
                return kinds[rel.replace(/[\s_-]+/g, '')] || 'other';
            }
            switch (Number(o.relation)) {
                case REL.FRIEND: return 'friend';
                case REL.CLAN: return 'clan';
                case REL.CLAN_ALLY:
                case REL.FRACTION_ALLY: return 'ally';
                case REL.CLAN_ENEMY: return 'clanEnemy';
                case REL.ENEMY:
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
                out.push({ id: String(id), nick: o.nick || '?', x: Number(o.x), y: Number(o.y), lvl: o.lvl, prof: o.prof || '', clan, kind, dist, hostile: kind === 'enemy' || kind === 'clanEnemy' || kind === 'other' });
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
