# Zestaw pod przeciwnika — 1.0.0

Dodatek do Gogatków dla Nowego Interfejsu. W panelu wybierz „Odśwież listę”, włącz „Zestaw pod przeciwnika” i odśwież grę. Automat jest początkowo wyłączony. Przypisz zapisane pełne zestawy postaci do profesji i opcjonalnie do co najmniej dwóch przeciwników, następnie włącz automatyczną zmianę.

LPM na ikonie otwiera panel; LPM na ikonie otwartego panelu przełącza ustawienia, PPM zwija panel. Nagłówek pozwala przesuwać okno. Zwinięcie nie zatrzymuje automatyki. Kafelek korzysta ze wspólnego docka Gogatków.

Zasięg: 5 kratek w osi, 4 przy przesunięciu w obu osiach. Uwzględnia wrogów, wrogów klanu i poszukiwanych; nieznajomych tylko po włączeniu opcji. Przyjaciele, klan i sojusznicy są chronieni. Zestaw dla wielu przeciwników ma pierwszeństwo; bez niego wybierana jest profesja najbliższego. Po oddaleniu gracza zestaw pozostaje bez zmian.

Automat działa wyłącznie na aktualnie czerwonej mapie, poza walką. Można dodatkowo wstrzymać go w grupie oraz na mapach tytanów, kolosów i ich przedsionków. Czeka na potwierdzenie zmiany zestawu; brak potwierdzenia przez 5 sekund wyłącza automat. Ustawienia i pozycja są osobne dla postaci i świata.

Po włączeniu otwórz zestawy postaci w grze, jeśli lista jest pusta. Ustawienia wcześniejszego osobnego userscriptu trzeba ustawić w Gogatkach ponownie, ponieważ Tampermonkey izoluje ich zapis. Wyłącz automat w poprzednim userscripcie przed uruchomieniem go w Gogatkach.

Kontrole: `node --check gogatki/modules/proximity-build.js`, `node tests/proximity-build.cjs`, `node tests/proximity-build-runtime.cjs`. Opcjonalny test przeglądarkowy: `TEST_BROWSER=1 node tests/proximity-build.cjs` (Playwright i Chromium; opcjonalnie `CHROMIUM_PATH`). Testy runtime używają symulowanego NI; potwierdzenie działania w zalogowanej grze pozostaje do wykonania.
