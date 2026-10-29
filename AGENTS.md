Materiały dydaktyczne są opracowywane w formacie Org-mode.

Zachowuj poprawność matematyczną, ścisłość definicji i spójność notacji.

Nie zmieniaj treści merytorycznej bez wyraźnego polecenia.

Wprowadzaj tylko zmiany związane z zadaniem.

Przed edycją sprawdzaj strukturę powiązanych rozdziałów.

Stosuj istniejące konwencje zapisu wzorów LaTeX oraz odsyłaczy Org.

We wszystkich materiałach stosuj kropkę jako separator dziesiętny, np.
`1.5`, także we wzorach LaTeX, tabelach, podpisach i wynikach ilustracji.
Przecinki rozdzielające argumenty, współrzędne lub elementy list zachowuj.

Po zmianach sprawdzaj poprawność eksportu do HTML.

Przedstawiaj zestawienie zmian i zgłaszaj niepewności merytoryczne.

## Rola Codexa w tym projekcie

Domyślnie wykonuj prace techniczne: rozpoznawanie repozytorium, naprawy
eksportu Org → HTML, odsyłaczy, nawigacji, stylów i skryptów, implementację
zamówionych demonstracji oraz testowanie i przegląd zmian. To przyjęty dla
tego projektu zakres zastosowań Codexa opisanych przez OpenAI; źródła
i instrukcja pracy są w `CODEX.org`.

Autor ustala zakres kursu, kolejność wywodu, definicje, założenia twierdzeń,
dowody, notację i interpretację wyników. Zmiany tych elementów oraz nowych
przykładów matematycznych wprowadzaj na wyraźne polecenie. Wykryte
wątpliwości zgłaszaj z lokalizacją; nie poprawiaj ich przy okazji napraw
technicznych. Działający program ani poprawny eksport nie są dowodem
poprawności matematycznej.

## Mapa plików i źródła

- `index.org` jest jedynym źródłem treści kursu: bieżących rozdziałów
  i dodatku o arytmetyce. Zawiera też podpisy, kontrolki i statyczne SVG
  ilustracji. Każdy nagłówek pierwszego poziomu rozpoczyna rozdział;
  numeracja wynika z hierarchii. Kolejne rozdziały dodawaj przed dodatkiem.
  Nie utrwalaj numerów rozdziałów w nazwach kotwic. Zachowuj `CUSTOM_ID`
  przy przenoszeniu fragmentów. Kurs nie ma ustalonej liczby rozdziałów.
- `index.html` jest wynikiem `python3 narzedzia/eksportuj_org.py`.
  Używaj tego polecenia, ponieważ zwykły eksport Emacsa pomija końcowy skład
  MathML, utrwalenie kotwic i odtworzenie przekierowań. Eksport nie wykonuje
  bloków kodu. Wymaga Pythona 3, Emacsa z Org-mode oraz Pandoca.
  Wynikowe wzory są natywnym MathML i nie wymagają MathJax ani sieci.
- `oprawa/scalone/book.css` i `book.js` są aktywną oprawą kursu. Style
  i demonstracje są ograniczone do odpowiednich rozdziałów; identyfikatory
  mają prefiksy tematów. Treść, wzory i podpisy zmieniaj w `index.org`,
  wygląd i zachowanie kontrolek — w tych CSS/JavaScript.
- `oprawa/scalone/przekierowania.json` mapuje sześć dawnych adresów HTML
  i ich kotwice na rozdziały wspólnej strony. Eksport odtwarza te HTML jako
  przekierowania z widocznym odsyłaczem zastępczym. Nie edytuj ich ręcznie.
- Dawne wskazówki Org do przeniesionych rozdziałów usunięto. Nie odtwarzaj
  ich: jedynym źródłem treści kursu jest `index.org`. Katalogi
  `rozdzial-03-org/` i `rozdzial-04-05-org/` usunięto wraz z trzema
  przekierowaniami w podkatalogach, zgodnie z decyzją autora.
- `narzedzia/wzorce/` zawiera cztery zachowane moduły JavaScript do testów:
  `01-numerics.js`, `02-numerics.js`, `pierwiastki.js` i `newton-3d.js`.
  Skrypt `pierwiastki.js` obsługuje również historyczny podgląd bisekcji.
  Jego pozostałe zasoby znajdują się w `przeglady/oprawa/`.
  Zachowanych zasobów nie nadpisuj ani nie usuwaj bez sprawdzenia zależności.
  Pomocniczych Org w `oprawa` nie eksportuj jako samodzielnych dokumentów.
- `scenariusz-prowadzacego.org` jest osobnym źródłem odpowiadającego mu HTML.
  `przeglady/` zawiera historyczne przeglądy i propozycje. Ich zasoby
  i względne ścieżki pozostają potrzebne.
- `CZYTAJ.org` w katalogu głównym opisuje aktualny układ projektu.
  Instrukcje dawnych pakietów są w `przeglady/instrukcje-pakietow/`;
  zawierają aktualną lokalizację zasobów oraz historyczny opis.
- `CODEX.org` opisuje pracę i polecenia projektu. `WARSZTAT-NOTATEK.org`
  zbiera ustalenia, korekty, plan przyszłych tematów i materiał do skilla.
  Wpis W-04 wskazuje kopię pełnych materiałów sprzed scalenia poza katalogiem
  publikowanym. Historyczne numery tematów nie narzucają nowej numeracji.
- `.codex/config.toml` zawiera aktywne ustawienia projektu: `on-request`,
  `workspace-write` i `sandbox_workspace_write.network_access = false`.
  Model i poziom rozumowania są dziedziczone z ustawień użytkownika.
- `codex-config.example.toml` pozostaje szablonem tych ustawień;
  sam plik `.example` nie jest automatycznie wczytywany.
- `.gitignore` pomija autozapis i kopie Emacsa, pamięć podręczną, pliki
  tymczasowe, lokalne środowiska i poświadczenia. Z `.codex/` wersjonujemy
  wyłącznie `config.toml`.

Nowe materiały dydaktyczne zapisuj w Org-mode. Zmieniaj źródło, a HTML
odtwarzaj przez eksport. Zachowuj nazwy plików, trwałe kotwice, mapę dawnych
adresów i działanie demonstracji. Przy przenoszeniu HTML uwzględniaj zasoby.

## Przebieg pracy i sprawdzenie

1. Odczytaj `git status --short`, właściwe źródło i powiązane rozdziały.
   Zachowaj zastane zmiany użytkownika, także pliki nieśledzone przez Git.
2. Wykonaj zmianę w zakresie zlecenia. Nie rozszerzaj jej o porządkowanie
   pozostałych rozdziałów ani o migrację HTML do Org.
3. Uruchom `python3 narzedzia/sprawdz_projekt.py` oraz `git diff --check`.
   Sprawdzanie obejmuje podkatalogi i zależności Org, a następnie eksportuje
   dokumenty na tymczasowej kopii projektu z zachowaniem `oprawa`, bez
   wykonywania bloków kodu. Pomija pomocnicze Org w `oprawa` jako osobne
   dokumenty oraz pliki blokad, autozapisu i kopie zapasowe Emacsa.
   Wymaga Pythona 3, Emacsa z Org-mode i Pandoca.
   Jeśli narzędzia brakuje lub sprawdzenie się nie powiedzie, podaj to
   w raporcie i nie deklaruj pomyślnej weryfikacji.
   Po zmianach JavaScriptu uruchom też `node narzedzia/sprawdz_oprawe.cjs`
   (wymaga Node.js); porównuje obliczenia i generowane SVG z zachowanymi
   modułami sprzed scalenia. Po zmianach nawigacji uruchom także
   `node narzedzia/sprawdz_nawigacje.cjs`. Nie zastępują kontroli w przeglądarce.
4. Przy zmianach wyglądu lub działania obejrzyj właściwy HTML w przeglądarce
   i sprawdź zmienioną funkcję; sama kontrola odsyłaczy tego nie zastępuje.
   Wersję wynikową HTML aktualizuj tylko dla dokumentów objętych zleceniem.
5. Podaj zmienione pliki, wynik sprawdzeń oraz pozostałe ograniczenia
   i wątpliwości merytoryczne. Prace lokalne kończ w katalogu projektu;
   commit, wysłanie zmian i publikację wykonuj, gdy obejmuje je polecenie.

## Materiał do przyszłego skilla

Przy pracy nad notatkami czytaj właściwe ustalenia w `WARSZTAT-NOTATEK.org`.
Po istotnej korekcie lub decyzji dopisz tam jej powód, zakres i wynik
sprawdzenia. Odróżniaj polecenia autora, propozycje do oceny i wzorce
zaakceptowane przez autora; nie przypisuj akceptacji bez podstawy.
Rutynowych zmian technicznych nie trzeba powielać w rejestrze warsztatu.
