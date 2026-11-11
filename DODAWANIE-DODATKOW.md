# Jak dodać nowy dodatek do Gogatków

Poradnik dla osoby rozwijającej panel [KoniecDniaDziecka/Gogatki](https://github.com/KoniecDniaDziecka/Gogatki). Przykład poniżej tworzy prosty panel „Mój dodatek”, który można przesuwać, zwijać i podłączyć do wspólnego paska. W jego miejsce dopisujesz właściwą funkcję dodatku.

Potrzebujesz konta GitHub z prawem zapisu do repozytorium (albo własnego forka i pull requesta), edytora tekstu oraz Tampermonkey do sprawdzenia działania w grze. Do lokalnych kontroli przydadzą się Node.js i Python 3. Znajomość podstaw JavaScript jest potrzebna do napisania samego dodatku.

## 1. Które pliki zmieniamy

| Plik | Do czego służy | Kiedy go zmienić |
| --- | --- | --- |
| `gogatki/modules/moj-dodatek.js` | Kod nowego dodatku | Zawsze przy dodawaniu tego modułu |
| `gogatki/catalogue.json` | Lista nazw, opisów i adresów modułów | Aby dodatek pojawił się na liście Gogatków |
| `gogatki/dock.js` | Wspólny pasek kafelków; tablica `specs` | Jeśli dodatek ma mieć kafelek w pasku |
| `gogatki/gogatki.user.js` | Instalowany loader: pobiera katalog, dock i włączone moduły | Przy zmianie loadera lub jego wbudowanej listy awaryjnej |

Zwykłe dodanie modułu nie wymaga przebudowania ani ponownej instalacji loadera. `gogatki/panel.js` nie jest plikiem wskazanym przez link instalacyjny — nie dopisuj tam nowych modułów. Dla zwykłego pliku w `modules/` nie ma wspólnego polecenia budowania.

Przykłady istniejących integracji: [Anty X](gogatki/modules/anty-x.js), [Better X](gogatki/modules/better-x.js) i tablica `specs` w [dock.js](gogatki/dock.js). Strategy ma osobne źródła i skrypt `tools/build-strategy.py`; nie jest to generator wszystkich dodatków.

## 2. Wybierz stałe identyfikatory

W tym przykładzie używamy:

| Element | Wartość |
| --- | --- |
| ID modułu w katalogu i rejestracji | `moj-dodatek` |
| Plik modułu | `gogatki/modules/moj-dodatek.js` |
| Nazwa widoczna dla gracza | `Mój dodatek` |
| ID elementu HTML panelu | `gogatki-moj-dodatek` |
| Klucz ustawień Tampermonkey | `moj-dodatek:global:v1` |

ID modułu musi być unikalne i pasować do `^[a-z][a-z0-9-]{0,63}$`: mała litera na początku, dalej małe litery, cyfry i myślniki, łącznie maksymalnie 64 znaki. Nazwa widoczna dla gracza może zawierać polskie litery i spacje. ID elementu HTML jest osobnym identyfikatorem — użyj go później w `dock.js`.

Nie zmieniaj ID opublikowanego dodatku przy zwykłej aktualizacji: przełącznik włączenia jest zapisywany pod tym ID. Klucze ustawień też zachowuj, a przy zmianie ich formatu przygotuj migrację.

## 3. Utwórz plik modułu

Zapisz poniższy kod jako `gogatki/modules/moj-dodatek.js`. To działający szkielet interfejsu, bez automatyki i bez wysyłania żądań do gry. Przycisk zwiększa jedynie licznik, żeby było widać, że kod działa.

```js
// Mój dodatek 1.0.0
GogatkiRuntime.register({
  id: 'moj-dodatek',
  name: 'Mój dodatek',
  description: 'Przykładowy panel nowego dodatku.',
  start() {
    'use strict';
    const window = unsafeWindow;
    const document = window.document;
    const HOST_ID = 'gogatki-moj-dodatek';
    const KEY = 'moj-dodatek:global:v1';
    if (document.getElementById(HOST_ID)) return;

    let saved;
    try { saved = GM_getValue(KEY, {}); } catch { saved = {}; }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
    const state = {
      right: Number.isFinite(saved.right) ? saved.right : 20,
      top: Number.isFinite(saved.top) ? saved.top : 160,
      collapsed: saved.collapsed === true,
      settings: saved.settings === true
    };
    function save() {
      try { GM_setValue(KEY, { ...state }); }
      catch (error) { console.warn('[Mój dodatek] Zapis ustawień:', error); }
    }

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'position:fixed;z-index:2147483000;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{all:initial;font:12px/1.3 Arial,sans-serif;color:#c7d0d9}
      *{box-sizing:border-box;font-family:Arial,sans-serif;text-shadow:none}
      [hidden]{display:none!important}
      .panel{width:240px;max-width:100vw;background:#171b20;
        border:1px solid #668298;border-radius:4px;overflow:hidden}
      header{display:flex;align-items:center;height:28px;
        background:#252b31;cursor:move;touch-action:none}
      strong{flex:1;padding:0 8px;color:#12c9bd}
      button{font:inherit;color:#c7d0d9;background:#38566c;
        border:1px solid #6d879a;border-radius:3px;padding:5px;cursor:pointer}
      button:focus-visible{outline:2px solid #12c9bd;outline-offset:-2px}
      .gear{display:flex;align-items:center;justify-content:center;
        width:26px;height:26px;padding:3px;border:0;
        background:#252b31;color:#12c9bd}
      svg{display:block;pointer-events:none}
      main{padding:8px}
      p{margin:6px 0 0;color:#b1c0cb;font-size:11px}
      .settings{margin-top:8px;border-top:1px solid #668298;padding-top:8px}
      .collapsed{width:var(--tile);height:var(--tile)}
      .collapsed header,.collapsed .gear{width:100%;height:100%}
      .collapsed strong,.collapsed main{display:none}
    </style>
    <section class="panel">
      <header><strong>Mój dodatek</strong>
        <button type="button" class="gear" aria-label="Opcje Mojego dodatku"
          title="LPM: ustawienia · PPM: zwiń">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/>
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
          </svg>
        </button>
      </header>
      <main><button type="button" class="action">Sprawdź działanie</button>
        <p role="status">Gotowy</p>
        <div class="settings" hidden>Tu dodaj opcje swojego dodatku.</div>
      </main>
    </section>`;
    const panel = root.querySelector('.panel');
    const options = root.querySelector('.settings');
    const gear = root.querySelector('.gear');
    const header = root.querySelector('header');

    function place() {
      // Dock sam ustawia pozycję zaparkowanego panelu.
      if (window.__gogatkiTileDock?.isDocked(host)) return;
      state.right = Math.max(0, Math.min(state.right,
        Math.max(0, window.innerWidth - host.offsetWidth)));
      state.top = Math.max(0, Math.min(state.top,
        Math.max(0, window.innerHeight - host.offsetHeight)));
      host.style.right = state.right + 'px';
      host.style.top = state.top + 'px';
    }
    function render() {
      const launcher = document.querySelector('#gogatek-panel')
        ?.shadowRoot?.querySelector('.launcher');
      panel.style.setProperty('--tile',
        (launcher?.getBoundingClientRect().height || 28) + 'px');
      panel.classList.toggle('collapsed', state.collapsed);
      options.hidden = state.collapsed || !state.settings;
      gear.setAttribute('aria-expanded', String(!options.hidden));
      place();
    }
    gear.addEventListener('click', () => {
      if (state.collapsed) state.collapsed = false;
      else state.settings = !state.settings;
      render(); save();
    });
    gear.addEventListener('contextmenu', event => {
      event.preventDefault(); state.collapsed = !state.collapsed;
      render(); save();
    });

    let count = 0;
    root.querySelector('.action').addEventListener('click', () => {
      // Tu wywołaj właściwą funkcję dodatku.
      root.querySelector('[role="status"]').textContent = 'Kliknięcia: ' + (++count);
    });
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      drag = { x: event.clientX, y: event.clientY,
        right: state.right, top: state.top };
      header.setPointerCapture(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      state.right = drag.right + drag.x - event.clientX;
      state.top = drag.top + event.clientY - drag.y;
      place();
    });
    function endDrag() { if (drag) { drag = null; save(); } }
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);
    header.addEventListener('lostpointercapture', endDrag);

    document.body.append(host);
    render();
    window.addEventListener('resize', render);
    window.addEventListener('pagehide', () => {
      window.removeEventListener('resize', render);
      // Tu zatrzymaj własne timery i odepnij własne hooki gry.
    }, { once: true });
  }
});
```

Loader przekazuje modułowi `GogatkiRuntime`, `unsafeWindow`, `GM_getValue` i `GM_setValue`. Rejestracja ma nastąpić synchronicznie, dokładnie raz podczas wykonania pliku. Tworzenie panelu, timery i podpinanie obsługi gry umieszczaj wewnątrz `start()`. Loader wywołuje `start()` bez `await`: jeżeli uruchamiasz własne operacje asynchroniczne, obsłuż ich błędy w module.

Moduł jest zwykłym skryptem wykonywanym przez `new Function`, nie modułem ES ani Node.js: nie używaj bezpośrednio `import`, `export` i `require`. Nie potrzebuje nagłówka `// ==UserScript==` ani osobnej instalacji w Tampermonkey. Inne funkcje GM nie są częścią przekazywanego interfejsu — nowe uprawnienia lub sposób pobierania danych trzeba świadomie dodać w loaderze.

`GM_getValue` i `GM_setValue` należą do tego samego userscriptu, więc zapis jest wspólny dla światów i postaci. Używaj własnego prefiksu kluczy; jeśli dane mają zależeć od postaci lub świata, dodaj odpowiedni identyfikator do klucza. Zapisuj zwykłe dane, bez elementów DOM i funkcji. Własny przycisk „Stop” powinien jawnie zatrzymywać automatykę; samo zwinięcie panelu zmienia tylko wygląd.

## 4. Dopisz pozycję do katalogu

W `gogatki/catalogue.json` dodaj poniższy obiekt na końcu tablicy `modules`, po przecinku oddzielającym go od poprzedniego obiektu:

```json
{
  "id": "moj-dodatek",
  "name": "Mój dodatek",
  "description": "Przykładowy panel nowego dodatku.",
  "url": "https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/moj-dodatek.js?v=1.0.0"
}
```

Zostaw `schemaVersion: 1` i istniejące wpisy. JSON nie pozwala na komentarze ani przecinek za ostatnim elementem tablicy. `id` musi zgadzać się z `GogatkiRuntime.register({ id: ... })`. Nazwa i opis na liście pochodzą z katalogu.

Adres ma zwracać surowy JavaScript (Raw), nie stronę GitHuba z `/blob/`. Obecny loader dopuszcza moduły tylko z tego samego originu i katalogu `modules/` wyznaczonego względem `catalogueUrl`. W produkcji jest to `https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/modules/`. Nie podpinaj bezpośrednio skryptu z innej domeny, repozytorium albo gałęzi — walidator odrzuci taki adres.

Nowy moduł jest domyślnie wyłączony; użytkownik zaznacza go w panelu. Wadliwy wpis może uniemożliwić odświeżenie całego katalogu, dlatego sprawdź JSON przed publikacją.

## 5. Dodaj kafelek do wspólnego paska

Dla panelu z powyższego przykładu dopisz obiekt do tablicy `specs` na początku `gogatki/dock.js`:

```js
{id:'gogatki-moj-dodatek', name:'Mój dodatek', control:'.gear', shadow:true, clickToOpen:true}
```

W tym miejscu `id` oznacza **ID elementu HTML**, czyli `host.id`, a `control` jest selektorem przycisku zębatki. `shadow:true` informuje dock, że stan zwinięcia odczyta z `.panel.collapsed` wewnątrz Shadow DOM. `clickToOpen:true` powoduje użycie LPM do otwarcia zwiniętego panelu; do zwijania otwartego panelu dock wywoła `contextmenu`. Ikonę SVG skopiuje z przycisku `.gear`.

Dock wykrywa dodane elementy sam. Nie ma publicznego `register()` służącego do dodawania kafelków z modułu; dopisujesz je w `specs`. Sam wpis w katalogu daje przełącznik na liście, ale nie dodaje kafelka. Dodatek bez panelu nie potrzebuje wpisu w docku.

Przy własnym interfejsie zachowaj zgodność: Shadow DOM z `.panel.collapsed` albo, dla panelu bez Shadow DOM, `host.dataset.compact = 'true'` przy zwinięciu. W funkcji pozycjonującej sprawdzaj `window.__gogatkiTileDock?.isDocked(host)`; nie nadpisuj współrzędnych zaparkowanego panelu. Zachowaj też dotychczasowe wpisy i wyjątki, np. Gift, QF oraz Strategy.

## 6. Dopisz właściwe działanie i zachowaj wspólną obsługę

Nie kopiuj całego innego dodatku bez zmiany ID, kluczy zapisu, selektorów i ewentualnych globalnych znaczników uruchomienia. To częsta przyczyna kolizji. Jeśli przenosisz funkcję z Maddonz lub Gargonem, najpierw przeczytaj `AGENTS.md` w prywatnym repozytorium `KoniecDniaDziecka/test` i sprawdź tamtejsze `margonem-sources/`. Oryginały pozostaw bez zmian; adaptuj kopię i sprawdź jej zależności.

- SI i NI mają różne API. Sprawdzaj istnienie potrzebnych obiektów i metod. Gotowość głównego panelu nie gwarantuje gotowości każdej części gry. Jeśli obsługujesz tylko jeden interfejs, napisz to w opisie i pokaż czytelny komunikat na drugim.
- Kod nie może uruchamiać się podwójnie. Przy podpinaniu hooków zachowuj `this`, argumenty i wynik oryginalnej funkcji; zaplanuj bezpieczne odpięcie własnych zmian. Timery i nasłuchy sprzątaj przy opuszczeniu strony. Skróty klawiszowe nie mogą reagować podczas pisania na czacie ani w polach formularzy, także wewnątrz Shadow DOM (`event.composedPath()`).
- Stosuj nieprzezroczyste tło `#171b20`, nagłówek `#252b31`, obramowanie `#668298`, akcent `#12c9bd`, tekst `#c7d0d9`, tekst pomocniczy `#b1c0cb` i Arial 12 px. Przyciski: tło `#38566c`, ramka `#6d879a`. Izoluj CSS od gry; używaj SVG, etykiet i widocznego fokusu. Checkboxy mają mieć 14 × 14 px i jeden znacznik zaznaczenia.
- LPM na zębatce przełącza ustawienia, PPM zwija do ikony, LPM na zwiniętej ikonie przywraca panel. Ustawienia rozwijaj z zachowaniem prawego górnego rogu; współrzędne `right` i `top` w przykładzie to zapewniają, o ile panel mieści się w oknie. Koryguj pozycję przy krawędziach ekranu.
- Wysokość zwiniętego panelu odczytuj z `.launcher` Gogatków; bez niego stosuj 28 px. Sama ikona ma taką samą szerokość i wysokość. Dock obecnie osobno ustawia własne kafelki na 28 px — nie wymuszaj zmiany jego rozmiaru na podstawie większego głównego launchera. Dodatki z nazwą lub akcją po zwinięciu mogą być szersze.
- Zapamiętuj pozycję i stan zwinięcia. Sprawdź przeciąganie, odtworzenie zapisu oraz zmianę wielkości okna. Zwijanie nie powinno zatrzymywać działania dodatku.

## 7. Sprawdź przed udostępnieniem

Uruchom z głównego katalogu repozytorium:

```bash
node --check gogatki/modules/moj-dodatek.js
node --check gogatki/dock.js
python3 -m json.tool gogatki/catalogue.json > /dev/null
git diff --check
git diff -- gogatki/modules/moj-dodatek.js gogatki/catalogue.json gogatki/dock.js
```

`node --check` sprawdza składnię bez uruchamiania modułu; nie potwierdza zgodności z API gry. Nowy, jeszcze nieśledzony plik nie pojawi się w zwykłym `git diff` — obejrzyj go w edytorze, a po `git add` sprawdź również `git diff --cached`. Polecenia nie wymagają `npm install`. Repozytorium ma też testy `tests/better-x.cjs` i `tests/strategy.cjs`, wymagające Playwright oraz Chromium; są testami konkretnych dodatków, nie automatycznym testem każdego nowego modułu.

Aby sprawdzić zmiany **przed połączeniem z `main`**, użyj gałęzi testowej, np. `test-moj-dodatek`, i osobnej lokalnej kopii userscriptu w Tampermonkey:

1. Zapisz moduł, katalog i zmieniony dock na gałęzi. W jej `catalogue.json` adres nowego modułu i wszystkich pozostałych wpisów powinien wskazywać tę samą gałąź.
2. W testowej kopii `gogatki.user.js` zmień `catalogueUrl` i `dockUrl` na Raw tej gałęzi. Usuń z tej kopii `@updateURL` i `@downloadURL`, żeby aktualizacja produkcyjna nie nadpisała testu; nadaj jej nazwę z dopiskiem TEST.
3. Wyłącz produkcyjny userscript w Tampermonkey, włącz tylko testowy i odśwież grę. Dwie kopie loadera mają wspólny znacznik `window.__gogatekLoaded`, więc jednoczesne włączenie utrudnia testy. Jeżeli panel pokazuje użycie listy awaryjnej, popraw pobieranie katalogu przed dalszym testem.
4. Po sprawdzeniu przywróć produkcyjne adresy `.../main/gogatki/modules/...` w katalogu przeznaczonym do połączenia. Testowej kopii loadera nie publikuj jako produkcyjnej. Po teście wyłącz ją, przywróć produkcyjny userscript i odśwież grę.

Lista kontroli w przeglądarce:

- [ ] Nowy wpis jest na liście po „Odśwież listę”; początkowo jest wyłączony.
- [ ] Zaznaczenie uruchamia dokładnie jedną instancję i nie daje błędów w konsoli F12.
- [ ] Funkcja działa na deklarowanych interfejsach SI/NI, również po zmianie mapy i wejściu/wyjściu z walki, jeśli ich dotyczy.
- [ ] LPM, PPM, ustawienia, przeciąganie i powrót z docka działają; zwinięcie nie zatrzymuje funkcji.
- [ ] Po odświeżeniu zostają ustawienia, pozycja, stan zwinięcia i stan przełącznika; panel mieści się po zmniejszeniu okna.
- [ ] Odznaczenie oraz „Zastosuj i odśwież grę” wyłączają dodatek. Pozostałe dodatki nadal działają.
- [ ] Brak potrzebnego API lub błąd operacji daje czytelny komunikat zamiast serii nieobsłużonych błędów.

## 8. Zapisz zmiany na GitHubie

Najlepiej zapisz moduł, katalog i dock w jednym commicie na gałęzi i otwórz pull request do `main`. Przykładowy początek pracy lokalnej:

```bash
git clone https://github.com/KoniecDniaDziecka/Gogatki.git
cd Gogatki
git switch -c dodatek/moj-dodatek
```

Po dodaniu plików i wykonaniu kontroli:

```bash
git add gogatki/modules/moj-dodatek.js gogatki/catalogue.json gogatki/dock.js
git diff --cached
git commit -m "Dodaj moduł Mój dodatek"
git push -u origin dodatek/moj-dodatek
```

Na GitHubie otwórz PR z tej gałęzi do `main`; opisz działanie i wyniki sprawdzenia w grze. Jeśli dodatek nie ma kafelka, pomiń `dock.js` w poleceniach. Gdy pracujesz przez stronę GitHuba, analogicznie użyj **Add file → Create new file / Upload files** na gałęzi, potem edytuj katalog i dock. Jeśli zapisujesz osobnymi commitami bezpośrednio na `main`, najpierw udostępnij moduł i potrzebny dock, a dopiero potem wpis katalogu, żeby gracze nie pobierali jeszcze nieistniejącego pliku.

Po pojawieniu się zmian na `main` gracz wybiera w Gogatkach **„Odśwież listę”**, a następnie zaznacza dodatek. Zmiany w docku są pobierane przy odświeżeniu gry. Samo zapisanie na gałęzi lub otwarcie PR nie udostępnia modułu produkcyjnemu loaderowi.

README pozostaw krótkie. Ten poradnik jest osobnym dokumentem dla osoby rozwijającej dodatki.

## 9. Aktualizowanie i najczęstsze problemy

Przy zmianie kodu zachowaj ID i klucze ustawień, zwiększ wersję w komentarzu modułu oraz parametr URL w katalogu, np. `?v=1.0.0` → `?v=1.0.1`. Parametr pomaga ominąć cache; nie przypina kodu do historycznej wersji pliku. Użytkownik powinien odświeżyć listę i grę. Loader pamięta pobraną definicję w bieżącej stronie — odświeżenie listy nie podmienia kodu już uruchomionego dodatku.

Jeżeli aktualizujesz wbudowany `fallbackCatalogue` w `gogatki.user.js`, zsynchronizuj go z katalogiem, zwiększ `@version` loadera i sprawdź jego składnię. Nie jest to konieczne do zwykłego udostępnienia nowego modułu przez zdalny katalog. Przy błędzie pobierania lista wraca do zapisanego katalogu, a gdy go brak, do `fallbackCatalogue`; dlatego nowa pozycja może wtedy być niewidoczna. Loader zapisuje awaryjnie także kod docka, ale nie utrwala kodu każdego modułu w GM storage.

| Objaw | Co sprawdzić |
| --- | --- |
| Brak nowego dodatku na liście | Czy wpis jest w `main`, JSON jest poprawny i odświeżanie katalogu nie korzysta z kopii awaryjnej |
| „Nieprawidłowy wpis listy” | Unikalne, poprawne ID; niepusta nazwa; tekstowy URL i opis |
| „Nieprawidłowy adres modułu” | Raw, właściwy origin, repozytorium, gałąź i ścieżka `modules/` względem `catalogueUrl` |
| HTTP 404 lub brak połączenia | Dokładna nazwa pliku, wielkość liter, opublikowana gałąź, dostępność adresu Raw |
| „Źródło zwróciło nieprawidłowy dodatek” | Zgodność ID z katalogiem, funkcja `start()`, tylko jedna rejestracja |
| „Źródło nie zawiera dodatku” | Czy plik wywołuje synchronicznie `GogatkiRuntime.register(...)` |
| Przełącznik działa, kafelka nie ma | Wpis w `specs`, poprawny `host.id` i selektor kontrolki; odświeżenie gry po zmianie docka |
| Panel znika lub nie otwiera się z paska | Klasa `.panel.collapsed` / `data-compact`, obsługa LPM/PPM, warunek `isDocked(host)` |
| Wciąż działa poprzedni kod | Nowy parametr `?v=`, odświeżenie listy i całej gry; ewentualne opóźnienie cache Raw |
| Odznaczony dodatek nadal działa | To obecny mechanizm loadera: użyj „Zastosuj i odśwież grę”; loader nie wywołuje `stop()` |

Stan poradnika sprawdzony na źródłach z 11 listopada 2026 r. Przy zmianach loadera sprawdź ponownie `start()`, `validateCatalogue()` i integrację w `dock.js`.
