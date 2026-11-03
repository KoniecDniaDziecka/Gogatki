# Gogatki

Panel dodatków w Tampermonkey z zewnętrznym katalogiem modułów. Od wersji **0.5.0 nowe dodatki można dopisywać do repozytorium bez aktualizowania zainstalowanego panelu**.

[Zainstaluj lub zaktualizuj Gogatki](https://raw.githubusercontent.com/KoniecDniaDziecka/Gogatki/main/gogatki/gogatki.user.js)

Jeśli link pokazuje tekst, podmień nim cały kod obecnego skryptu Gogatków i zapisz. Wyłącz osobne instalacje Ulepy, Lootfiltera i Wołacza oraz dodatkowe kopie Gogatków. Odśwież grę i kliknij „Gogatki”. Aktualizacja zachowuje zapisane przełączniki oraz pozycję.

## Jak działa panel

- Panel jest zapisany w skrypcie Tampermonkey; nie używa `@require`.
- Przy każdym odświeżeniu gry pobiera dane listy z `gogatki/catalogue.json`. Przycisk „Odśwież listę” pobiera ją również bez odświeżania gry.
- Kod modułu pobiera i uruchamia dopiero po zaznaczeniu jego przełącznika. Po odświeżeniu gry uruchamia tylko zapamiętane włączone dodatki. Bez zaznaczonych modułów pobierana jest tylko lista JSON, bez kodu dodatków.
- Wyłączenie już uruchomionego modułu wymaga przycisku „Zastosuj i odśwież grę”, żeby odłączyć jego timery i obsługę odpowiedzi gry.
- Odznaczenie podczas pobierania zapobiega uruchomieniu modułu.
- Błąd modułu pokazuje przycisk ponowienia. Błąd lub nieprawidłowy format katalogu powoduje użycie ostatniej poprawnej listy, a przy pierwszym uruchomieniu — listy trzech podstawowych dodatków.

Ulepa po uruchomieniu włącza automatykę nowego łupu zgodnie ze swoimi filtrami i wybranym celem. STOP jest w jej ustawieniach. Wołacz wysyła wiadomość na globalny według mapy i grupy.

## Dodawanie nowego dodatku bez aktualizacji Tampermonkey

1. Dodaj plik np. `gogatki/modules/nowy-dodatek.js`:

```js
GogatkiRuntime.register({
    id: 'nowy-dodatek',
    start() {
        // Kod dodatku. Dostępne: unsafeWindow, GM_getValue i GM_setValue.
        console.log('Nowy dodatek włączony');
    }
});
```

2. Dopisz pozycję do tablicy `modules` w `gogatki/catalogue.json`, zachowując pozostałe wpisy:

```json
{
  "id": "nowy-dodatek",
  "name": "Nowy dodatek",
  "description": "Krótki opis funkcji",
  "url": "./modules/nowy-dodatek.js?v=1"
}
```

3. Zapisz oba pliki na głównej gałęzi repozytorium. W grze kliknij „Odśwież listę” albo odśwież stronę. Nowy wpis pojawi się wyłączony; jego kod zostanie pobrany dopiero po zaznaczeniu.

Katalog ma format `{"schemaVersion":1,"modules":[...]}`. ID musi być unikatowe i takie samo w katalogu i pliku modułu. Adresy wskazują pliki w katalogu `gogatki/modules/` tego repozytorium. Zwiększaj parametr `?v=` przy publikacji nowej wersji danego modułu, żeby zmienić jego adres w pamięci podręcznej. Uruchomiony moduł otrzyma nową wersję po odświeżeniu gry; samo odświeżenie listy nie zastępuje kodu już działającego modułu.

Panel obsługuje moduły korzystające z obecnych uprawnień i tego źródła. Zmiana samego panelu, sposobu pobierania lub dodanie nowych uprawnień nadal wymaga aktualizacji skryptu Tampermonkey.

## Pozycja i ustawienia

Przesuwaj kafelek uchwytem ⠿ albo nagłówkiem listy; pozycja zapisuje się automatycznie. Uchwyt obsługuje strzałki klawiatury. Otwarcie listy nie przesuwa kafelka, a przy krawędziach lista mieści się w oknie.

Przełączniki, pozycja panelu, ostatnia lista i konfiguracja Lootfiltera zapisują się w pamięci Tampermonkey wspólnej dla obsługiwanych światów. Ulepa zachowuje ustawienia osobno dla postaci w localStorage. Ustawienia GM z osobno zainstalowanego Lootfiltera nie przenoszą się automatycznie. Strona główna `www.margonem.pl` i `margonem.pl` jest wykluczona.

## Pliki

| Plik | Zawartość |
| --- | --- |
| `gogatki/gogatki.user.js` | Panel, pobieranie katalogu i wybranych modułów |
| `gogatki/catalogue.json` | Aktualna lista dodatków — edytuj tutaj, żeby dodawać moduły |
| `gogatki/modules/ulepa.js` | Ulepa 1.2.3 |
| `gogatki/modules/lootfilter.js` | Lootfilter 1.0.6 |
| `gogatki/modules/wolacz.js` | Wołacz 1.4.0 |
| `gogatki/modules/gift.js` | Gift 1.0.5 — darmowe nagrody z Aktualności i kalendarza |
| `gogatki/modules/wolacz-ide.js` | Wołacz + idę — E2 i „Ide” przez Lootlog klanu Death Sentence |

`gogatki/panel.js` jest pozostawiony dla zgodności ze starymi instalacjami 0.3.x. Obecny panel go nie pobiera.

## Weryfikacja 0.5.0

Test Chromium z atrapą API gry sprawdza dodanie czwartego modułu wyłącznie przez zmianę katalogu przy niezmienionym skrypcie instalacyjnym; brak pobierania kodu wyłączonych modułów; uruchamianie zaznaczonych; zapis listy i użycie jej przy błędzie HTTP lub nieprawidłowym JSON; współpracę trzech modułów; ponowienie pobierania; odznaczenie podczas pobierania; pozycję kafelka. Sprawdzono składnię. Test nie obejmuje prawdziwego serwera gry ani samego rozszerzenia Tampermonkey.
