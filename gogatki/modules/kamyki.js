GogatkiRuntime.register({id:'kamyki', name:'Kamyki', description:'Dodanie grafik potworów do tp', start() {
(function () {
    'use strict';
    const config = {
      //Tytani
//orla
"189":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/dziewicza_orlica.gif",
//kic
"1746":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/zabojczy_krolik.gif",
//rene
"6949":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/renegat_baulus.gif",
//arcy
"7060":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/archdemon.gif",
//zoons
"7477":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/versus-zoons.gif",
//Ĺowka
"6477":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/lowcz-wspo-driady.gif",
//przyzy
"6476":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/przyz_demon_sekta.gif",
//magua
"7848":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/maddok_magua-1b.gif",
//teza
"5709":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/tezcatlipoca.gif",
//barba
"3312":"https://micc.garmory-cdn.cloud/obrazki/npc/tyt/hebrehoth_smokoludzie.gif",
//th
"2355": "https://micc.garmory-cdn.cloud/obrazki/npc/tyt/ice_king.gif",


//kolosy
//lambo
"3361":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/mamlambo_final2.gif",
//regulus
"3883":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/bazyliszek.gif",
//regulus2
"202":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/bazyliszek.gif",
//umibozu
"7353":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-wodnik.gif",
//umibozu2
"1739":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-wodnik.gif",
//amion
"4046":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/soploreki.gif",
//amion2
"1387":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/soploreki.gif",
//hydra
"4066":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/hydrokora.gif",
//hydra2
"264":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/hydrokora.gif",
//waszka
"4161":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-wazka.gif",
//waszka2
"349":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-wazka.gif",
//lulukav
"4196":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolkrucz.gif",
//lulukav2
"6052":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolkrucz.gif",
//arachin
"4206":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-pajak.gif",
//arachin2
"1131":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-pajak.gif",
//rauzen
"4266":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-dendro.gif",
//rauzen2
"3596":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-dendro.gif",
//drako
"4268":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-drakolisz.gif",
//drako2
"3037":"https://micc.garmory-cdn.cloud/obrazki/npc/kol/kolos-drakolisz.gif",

//E2 300-200
// Artek
"2353":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/wl-mrozu03.gif",
// Zorin
"2354":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/wl-mrozu01.gif",
// Furion
"2356":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/wl-mrozu02.gif",
// Monia
"6064":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/nymphemonia.gif",
// Terro urwisko
"3327":"https://micc.vigellal.ovh/obrazki/doritos/TERO.gif",
// Terro jaskinia
"3335":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/terrorzaur_pus.gif",
// ĹwiÄtynia przedsionek
"3339":"https://i.imgur.com/hudMHxo.gif",
// chaegd
"3341":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/bar_smokoszef.gif",
// Vera
"3340":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/bar_smoczyca.gif",
// Set
"3039":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/neferkar_set-1a.gif",
// Chopesz
"3035":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/chopesh2.gif",
//quezal
"5684":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/quetzalcoatl-1a.gif",
//yaotl
"5694":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/mahoplowca.gif",
//Fovos
"8554":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/fovos-1.gif",
//Kamieniorz
"8541":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/wyslannik_tellarow-1a.gif",
// Mazur
"8532":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/mazurnik_przybrzezny-1a.gif",  
// Sybilia
"4056":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/tri2_witch_e2.gif",
// Niecka (Ciut)
"1901":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/maho-cuaitl.gif",
//Tolypeutes
"5660":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/bolita.gif",
//Wabicielka
"8187":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/trist2_wabicielka-1a.gif",
//Dendroculus
"3597":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/dendroculus.gif",
//Fangaj
"8181":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/grzyb-humanoid-1b.gif",
//Silva
"3628":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/silvanasus.gif",
//Elgary
"8556":"https://micc.vigellal.ovh/obrazki/doritos/elgary_luna-1b_1.gif",
//pajak
"1159":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/regina-e2.gif",
//Mocny
"7843":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/mocny_maddoks-1b.gif",
"7842":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/mocny_maddoks-1b.gif",
//Marloth
"7864":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/drider-marlloth.gif",
//HIPCIO
"7827":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/arytodam_olbrzymi-1b.gif",  
//e2 dysleksja
"7859":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/drow-aldiphrin.gif",
//ZUF
"5943": "https://micc.garmory-cdn.cloud/obrazki/npc/e2/sekta-zufulus.gif",
//Sataniel
"7694":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/sekta-sataniel.gif",
//Tajemnicza Siedziba
"5941":"https://micc.vigellal.ovh/obrazki/doritos/sekta.gif",
//Bergamona
"5945": "https://micc.garmory-cdn.cloud/obrazki/npc/e2/sekta-bergermona.gif",


//E2 199-100 
//Sadolia
"5940":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/sekta-sadolia.gif",
//Kwiatek
"4185":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/zmutowana-roslinka.gif",      
//MyĹwiĂłr
"7701":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/mysiur_myswiorowy_krol-1a.gif",
//Breh
"2063":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/draki-breheret-1b.gif",
//Torka
"6053":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/thuz-patr1.gif",
//furb
"1912": "https://micc.garmory-cdn.cloud/obrazki/npc/e2/forbol03.gif",
//Cera
"7689": "https://micc.garmory-cdn.cloud/obrazki/npc/e2/cerasus-1a.gif",
//Ogr
"7693": "https://micc.garmory-cdn.cloud/obrazki/npc/e2/ogr_stalowy_pazur-1a.gif",
//Drzewo dusz
"6055": "https://micc.vigellal.ovh/obrazki/doritos/driady-sk.gif",
//KrĂłlowa
"7345": "https://micc.garmory-cdn.cloud/obrazki/npc/e2/krolowa-sniegu.gif",
//KrĂłlowa SK
"5862":"https://micc.vigellal.ovh/obrazki/doritos/sk-grafiki.gif",
//SK
"5861":"https://micc.vigellal.ovh/obrazki/doritos/sk-grafiki.gif",
//dwk
"5872":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/duch_wladcy_kl.gif",
//adariel
"1322":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/tri_adariel.gif",
//goons
"7474":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/goons_asterus-1a.gif",
//worundiel
"7466":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/worundriel02.gif",
//stworek
"7375":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/stworzyciel.gif",
//eol
"7352":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/piaskowy_potwor-6a.gif",
//morski potwĂłr
"7357":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/osmiornica-1b.gif",
//byk
"7368":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/ingotia_minotaur-7a.gif",
//Fodug
"7441":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/fodug_zolash.gif",        
//Sheba
"5851":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/r_orc_sheba.gif",        
//amuno
"7454":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/amuno.gif",
//gruber
"6955":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/grubber-ochlaj.gif",
//burek
"5856":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/orkczd.gif",
//piracie2
"1525":"https://micc.vigellal.ovh/obrazki/doritos/piraci-sk.gif",
//henry
"1526":"https://micc.vigellal.ovh/obrazki/doritos/piraci-sk.gif",
//helga
"1527":"https://micc.vigellal.ovh/obrazki/doritos/piraci-sk.gif",
//jack
"3409":"https://micc.vigellal.ovh/obrazki/doritos/piraci-sk.gif",
//Ifryt
"7057":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/magradit_ifryt.gif",
//Tesciowa
"351":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/goral-e2-tesciowa-rumcajsa.gif",

//Krab
"1741":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/krab_big3.gif",
//Krab2
"7369":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/krab_big3.gif",
//WĂłjt
"7339":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/goral-e2-wojt-fistula.gif",
//ozirus
"7069":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/mumia-ozirus.gif",
//czacha
"7066":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/alghul-czaszka-1a.gif",
//miĹek mag
"6946":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/blotniaki_milosnik_magii.gif",
//MiĹek ĹowcĂłw
 "6945": "https://micc.garmory-cdn.cloud/obrazki/npc/e2/blotniaki_milosnik_lowcow.gif",
//MiĹek rycerzy
"6944":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/blotniaki_milosnik_rycerzy.gif",
//jertek
"6938":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/moloch-jertek.gif",
//Kambion
"229":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/kambion.gif",

//E2 99-23
//Morthen
"6774":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/krasnolud_boss.gif",     
//Centaur
"3765":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/cent-zyfryd.gif",
//Figlid
"6781":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/gnom_figlid.gif",
//Gopa
"1150":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/goplana.gif",
//Leszy
"1324":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/lesne_widmo.gif",
//ochyda
"3466":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/ugrape2.gif",
//nadzorczyni
"6772":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/nadzorczyni_krasnoludow.gif",
//czoĹker
"6636":"https://micc.vigellal.ovh/obrazki/doritos/CHOUKER.gif",
//czoĹker2
"6634":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/dlawiciel5.gif",
//Stopa
"1204":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/wlochacze_wielka_stopa.gif",
//zbrojek
"6615":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/magaz_zbrojmistrz.gif",
//grabarz
"6623":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/nieu_mnich_grabarz.gif",
//Lisz
"6625":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/lisz_demilisze.gif",
//tolloki
"6632":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/tollok_jask_atamatu.gif",
//Jotun2
"6537":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/kam_olbrzym-b.gif",
//Jotun
"6535":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/kam_olbrzym-b.gif",
//Kozug
"3436":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/gnoll12.gif",
//Kozug2
"3437":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/gnoll12.gif",
//gnoll vari
"333":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/gnoll11.gif",
//owadzia
"5395":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/zadlak-e2-owadzia-matka.gif",
//kobold
"2729":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/kobold07.gif",
//agar
"177":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/glut_agar.gif",
//razuglag
"125":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/razuglag.gif",
//tollok
"5293":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/tollok_shimger.gif",
//szczÄt
"2308":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/zbir-szczet.gif",
//dzik
"4156":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/dzik.gif",
//wĹadek
"727":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/gobmag2.gif",
//gobos
"3149":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/gobsamurai.gif",      
//zorg
"2532":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/zbir-e2-zorg.gif",
//shea
"5738":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/demonszef.gif",
//shea2
"5740":"https://micc.vigellal.ovh/obrazki/doritos/SHAE.gif",
//kotoĹak
"632":"https://micc.garmory-cdn.cloud/obrazki/npc/e1/kotolak_lowca.gif",
//muszita
"1060":"https://micc.garmory-cdn.cloud/obrazki/npc/e2/st-puma.gif",

      

//Dodatkowa konfiguracja uĹźytkownia

    }

    const window = unsafeWindow;
    const marker = '__kamykiOverlayV024';
    if (window[marker]) throw new Error('Wyłącz samodzielny skrypt Kamyki i odśwież grę.');
    window[marker] = true;
    let enabled = GM_getValue('kamyki:enabled:v1', true) !== false;
    const host = document.createElement('div');
    host.id = 'kamyki-overlay';
    host.dataset.compact = 'true';
    host.style.cssText = 'position:fixed;right:18px;top:120px;z-index:2147483000';
    const root = host.attachShadow({mode:'open'});
    root.innerHTML = `<style>:host{all:initial;position:fixed}button{box-sizing:border-box;width:28px;height:28px;display:grid;place-items:center;padding:4px;background:#252b31;border:1px solid #668298;border-radius:4px;color:#74838d;cursor:pointer}button.active{color:#12c9bd}button:focus-visible{outline:2px solid #12c9bd}svg{width:18px;height:18px;pointer-events:none}</style><button type="button" aria-label="Kamyki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3Zm0 0 4 17M2 20l10-5 10 5"/></svg></button>`;
    const control = root.querySelector('button');
    function refreshControl() {
        control.classList.toggle('active', enabled);
        control.setAttribute('aria-pressed', String(enabled));
        control.title = `Kamyki — ${enabled ? 'włączone' : 'wyłączone'}. Kliknij, aby przełączyć.`;
    }
    function toggle(event) {
        event.preventDefault();
        enabled = !enabled;
        GM_setValue('kamyki:enabled:v1', enabled);
        refreshControl(); scheduleScan();
    }
    control.addEventListener('click', toggle);
    control.addEventListener('contextmenu', toggle);
    refreshControl();
    document.body.appendChild(host);
    const overlays = new Map();
    const imageCache = new Map();
    let NI, scanTimer, observer;

    function loadItemImage(url) {
        if (imageCache.has(url)) return imageCache.get(url);
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            const timer = setTimeout(() => finish(new Error('Przekroczono czas pobierania obrazka')), 15000);
            function finish(error) {
                clearTimeout(timer);
                img.onload = img.onerror = null;
                if (error) reject(error);
                else resolve({ width: img.naturalWidth, height: img.naturalHeight });
            }
            img.onload = () => img.naturalWidth && img.naturalHeight
                ? finish() : finish(new Error('Pusty obrazek'));
            img.onerror = () => finish(new Error('Nie udało się pobrać obrazka'));
            img.src = url;
        });
        imageCache.set(url, promise);
        promise.catch(() => {
            if (imageCache.get(url) === promise) imageCache.delete(url);
        });
        return promise;
    }

    function getItemStats(it) {
        if (it._cachedStats && typeof it._cachedStats === 'object') return it._cachedStats;
        const stats = {};
        for (const entry of String(it.stat || '').split(';')) {
            const pos = entry.indexOf('=');
            if (entry) stats[pos < 0 ? entry : entry.slice(0, pos)] = pos < 0 ? 'true' : entry.slice(pos + 1);
        }
        return stats;
    }
    function getItemTp(it) {
        const stats = getItemStats(it);
        const tp = stats.teleport || (stats.custom_teleport !== 'true' && stats.custom_teleport);
        return tp ? String(tp) : '';
    }
    function getLocationItems(loc) {
        if (NI) return Array.from(window.Engine.items.fetchLocationItems(loc) || []);
        return Object.values(window.g.item || {}).filter(it => it && it.loc === loc);
    }
    function removeOverlay(element) {
        overlays.delete(element);
        element.querySelectorAll('.priw8-item-overlay').forEach(img => img.remove());
        element.classList.remove('priw8-item-small-icon');
    }
    async function appendItemOverlay(element, url) {
        const current = overlays.get(element);
        if (current?.url === url) return;
        removeOverlay(element);
        const state = { url };
        overlays.set(element, state);
        try {
            const size = await loadItemImage(url);
            if (!element.isConnected || overlays.get(element) !== state) return;
            const base = element.querySelector(NI ? 'canvas' : 'img:not(.priw8-item-overlay)');
            if (!base?.parentElement) {
                overlays.delete(element);
                return;
            }
            const img = document.createElement('img');
            const scale = Math.min(1, 32 / size.width, 32 / size.height);
            img.className = 'priw8-item-overlay';
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            img.width = Math.max(1, Math.round(size.width * scale));
            img.height = Math.max(1, Math.round(size.height * scale));
            img.style.cssText = `position:absolute;top:0;left:${(32 - img.width) / 2}px;z-index:1;pointer-events:none;display:block`;
            img.onload = () => {
                img.onload = img.onerror = null;
                if (element.isConnected && overlays.get(element) === state)
                    element.classList.add('priw8-item-small-icon');
            };
            img.onerror = () => {
                img.onload = img.onerror = null;
                if (overlays.get(element) === state) removeOverlay(element);
            };
            base.parentElement.appendChild(img);
            img.src = url;
        } catch (error) {
            if (overlays.get(element) === state) removeOverlay(element);
            console.warn('[Kamyki]', url, error.message);
        }
    }
    function scan() {
        try {
            const items = enabled ? getLocationItems('g') : [];
            const wanted = new Map();
            for (const item of items) {
                const it = item?.d || item;
                if (!it || it.id == null) continue;
                const tp = getItemTp(it);
                const url = config[tp] ?? config[tp.split(',')[0]];
                if (!url) continue;
                const id = String(it.id);
                // An item may be visible in several game windows at once.
                for (const element of document.querySelectorAll(NI ? `.item-id-${CSS.escape(id)}` : `#${CSS.escape('item' + id)}`))
                    wanted.set(element, url);
            }
            for (const element of overlays.keys()) {
                if (!element.isConnected || !wanted.has(element)) removeOverlay(element);
            }
            for (const [element, url] of wanted) appendItemOverlay(element, url);
        } catch (error) {
            console.warn('[Kamyki] Nie udało się odświeżyć nakładek:', error);
        }
    }
    function scheduleScan() {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(scan, 60);
    }
    function boot() {
        NI = typeof window.Engine !== 'undefined';
        const owner = NI ? window.Engine?.communication : window;
        const key = NI ? 'parseJSON' : 'parseInput';
        const ready = NI ? window.Engine?.allInit && typeof window.Engine?.items?.fetchLocationItems === 'function'
            : window.hero?.id && window.g?.item;
        if (!document.head || !document.body || !ready || typeof owner?.[key] !== 'function') {
            setTimeout(boot, 500);
            return;
        }
        const original = owner[key];
        owner[key] = function (...args) {
            const result = Reflect.apply(original, this, args);
            scheduleScan();
            return result;
        };
        const style = document.createElement('style');
        style.textContent = `
            .priw8-item-small-icon img:not(.priw8-item-overlay),
            .priw8-item-small-icon canvas.canvas-icon {
                width:20px;height:20px;top:12px;z-index:1;
            }
            .priw8-item-small-icon .amount,.priw8-item-small-icon .cooldown {z-index:2}
        `;
        document.head.appendChild(style);
        observer = new MutationObserver(records => {
            if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
                node.nodeType === 1 && !node.classList.contains('priw8-item-overlay')))) scheduleScan();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.listStones = () => {
            for (const item of getLocationItems('g')) {
                const it = item?.d || item;
                const tp = getItemTp(it);
                if (tp) console.log(`${it.name} (${getItemStats(it).opis || ''}): ${tp.split(',')[0]} (${tp})`);
            }
        };
        scan();
    }
    boot();
})();

}});
