# Gogatki

Panel dodatków zainstalowany bezpośrednio w Tampermonkey. Ulepa, Lootfilter i Wołacz są pobierane z tego repozytorium dopiero po włączeniu ich przełączników. Wersja 0.4.0 nie używa `@require` i nie pobiera osobnego pliku panelu.

## Instalacja

1. Otwórz [Gogatki — instalacja lub aktualizacja](https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/gogatki.user.js) i zatwierdź w Tampermonkey. Jeśli widzisz tekst, podmień nim cały kod obecnego skryptu Gogatków i zapisz.
2. Wyłącz osobne instalacje Ulepy, Lootfiltera i Wołacza oraz dodatkowe kopie Gogatków.
3. Odśwież grę i kliknij „Gogatki”. Zaznacz wybrane dodatki — ich kod zostanie pobrany i uruchomiony od razu.

Aktualizacja wymaga uprawnienia do pobierania modułów z `raw.githubusercontent.com`. Skrypt nie działa na głównej stronie `www.margonem.pl` ani `margonem.pl`.

## Jak działają przełączniki

- Żaden dodatek zaznaczony: działa wyłącznie lokalny panel, bez żądań pobierania modułów.
- Zaznaczenie dodatku: pobranie jego pliku i uruchomienie; inne wyłączone dodatki nie są pobierane.
- Odświeżenie gry: automatyczne pobranie i uruchomienie tylko zapamiętanych włączonych dodatków.
- Odznaczenie już uruchomionego dodatku: zapis wyboru; kliknij „Zastosuj i odśwież grę”, aby odłączyć jego timery i przechwytywanie odpowiedzi gry.
- Odznaczenie podczas pobierania: odpowiedź nie uruchomi dodatku.
- Błąd pobierania: panel pokazuje błąd oraz przycisk ponowienia pobierania.

Ulepa po uruchomieniu włącza automatykę nowego łupu zgodnie ze swoimi filtrami i wybranym celem. STOP znajduje się w jej ustawieniach.

## Pozycja i ustawienia

Przesuwaj panel uchwytem ⠿ albo jego nagłówkiem; pozycja zapisuje się automatycznie. Uchwyt obsługuje również strzałki klawiatury. Zachowano zapisane przełączniki, pozycję i ustawienia z poprzednich wersji Gogatków.

Przełączniki, pozycja panelu i konfiguracja Lootfiltera zapisują się w pamięci Tampermonkey wspólnej dla obsługiwanych światów. Ulepa zachowuje zapis osobno dla postaci w localStorage. Ustawienia GM z osobno zainstalowanego Lootfiltera nie przenoszą się automatycznie.

## Pliki

| Plik | Zawartość |
| --- | --- |
| `gogatki/gogatki.user.js` | Kompletny panel, ustawienia i pobieranie wybranych modułów |
| `gogatki/modules/ulepa.js` | Ulepa 1.2.3 |
| `gogatki/modules/lootfilter.js` | Lootfilter 1.0.6 |
| `gogatki/modules/wolacz.js` | Wołacz 1.3.9 na globalny według mapy i grupy |

`gogatki/panel.js` pozostał dla zgodności ze starymi instalacjami 0.3.x. Wersja 0.4.0 go nie używa.

Moduły rejestrują funkcję `start` przez `GogatkiRuntime.register({id, name, description, start() {...}})`. Panel pobiera i wykonuje kod z tego repozytorium w kontekście skryptu Tampermonkey, przekazując wymagane funkcje GM. Dodanie kolejnego dodatku wymaga pliku modułu i wpisu w katalogu modułów panelu. Skrypt ma ustawione `@updateURL` i `@downloadURL`.

## Weryfikacja 0.4.0

Test Chromium z atrapą API gry obejmuje brak pobierania wyłączonych modułów, pobranie wyłącznie zaznaczonego modułu i jego natychmiastowe uruchomienie, zapamiętane wybory, współpracę trzech modułów, wyłączenie po odświeżeniu, zapis pozycji, odznaczenie podczas pobierania oraz błąd HTTP i ponowienie. Sprawdzono składnię. Działanie na prawdziwym serwerze gry i w samym rozszerzeniu Tampermonkey wymaga sprawdzenia w grze.
