# Gogatki

Jeden dodatek do Tampermonkey z panelem do włączania Ulepy, Lootfiltera i Wołacza na czat globalny. Skrypt instalacyjny ma 23 wiersze; panel i moduły są pobierane osobno przez `@require`.

## Instalacja

1. Zainstaluj rozszerzenie Tampermonkey.
2. Otwórz [Gogatki — instalacja](https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/gogatki.user.js) i zatwierdź instalację w Tampermonkey. Jeśli przeglądarka pokazuje sam tekst, skopiuj cały plik do nowego skryptu w Tampermonkey i zapisz.
3. Wyłącz wcześniejsze Gogatki oraz osobne skrypty Ulepy, Lootfiltera i Wołacza, jeśli są zainstalowane. Przy aktualizacji tej samej instalacji zachowaj jej zapisane ustawienia.
4. Odśwież grę. Otwórz „G · Gogatki”, zaznacz wybrane moduły i kliknij „Zastosuj i odśwież grę”.

Moduły są domyślnie wyłączone. Każdy zachowuje własny panel ustawień. Ulepa po włączeniu uruchamia automatykę przetwarzania nowego łupu zgodnie z jej filtrami i wybranym celem; przycisk STOP jest w ustawieniach Ulepy.

Panel Gogatków przesuwasz uchwytem ⠿ lub nagłówkiem otwartego panelu. Pozycja zapisuje się automatycznie; uchwyt obsługuje też strzałki klawiatury.

## Pliki

| Plik | Zawartość |
| --- | --- |
| `gogatki/gogatki.user.js` | Instalacja, adresy zależności i uruchomienie panelu |
| `gogatki/panel.js` | Panel, rejestr modułów, przełączniki i pozycja |
| `gogatki/modules/ulepa.js` | Ulepa 1.2.3 |
| `gogatki/modules/lootfilter.js` | Lootfilter 1.0.6 |
| `gogatki/modules/wolacz.js` | Wołacz 1.3.9 — wiadomość według mapy i grupy |

Wołacz obsługuje skonfigurowane mapy; m.in. mapa `4266` wysyła `244 Zapraszam!` bez grupy. To Wołacz na globalny, nie skrypt „Wołacz + ide” przez Lootlog.

## Ustawienia i aktualizacje

Przełączniki i pozycja Gogatków oraz konfiguracja Lootfiltera zapisują się w pamięci Tampermonkey wspólnej dla obsługiwanych światów. Ulepa zachowuje dotychczasowy zapis postaci w localStorage. Ustawienia GM z osobno zainstalowanego Lootfiltera nie przenoszą się automatycznie do Gogatków.

Tampermonkey pobiera pliki `@require` do swojej pamięci. Samo odświeżenie gry nie gwarantuje pobrania zmian opublikowanych w repozytorium. Kolejne wydania powinny podnosić wersję skryptu instalacyjnego i aktualizować adresy zmienionych zależności (np. przez parametr wersji), aby umożliwić ich odświeżenie. Skrypt ma skonfigurowane `@updateURL` i `@downloadURL`.

Dodanie nowego modułu wymaga pliku rejestrującego go przez `GogatkiRuntime.register({id, name, description, start() {...}})` i dodatkowego `@require` w skrypcie instalacyjnym. Pobranie modułu rejestruje go, a panel uruchamia jego funkcję `start` tylko po zapisaniu włączonego przełącznika.

## Weryfikacja wydania 0.3.1

Sprawdzone lokalnie: składnia, 12 testów filtrów łupu, ochrona przedmiotów i partie Ulepy oraz test Chromium z atrapą API gry obejmujący współpracę trzech modułów, Wołacza, zapis przełączników i przeciąganie panelu. Testy nie obejmują operacji na prawdziwym serwerze gry.
