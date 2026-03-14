MAKAO CBA (PHP + MySQL)

1) Skopiuj katalog makao-cba na serwer CBA do public_html.
2) Uruchom setup.sql (tabela wynikow).
3) Otworz /makao-cba/index.php.

Skad gra bierze DB:
- najpierw: makao-cba/config.php (jesli istnieje),
- potem: DB_HOST/DB_NAME/DB_USER/DB_PASS (runtime env lub ../.env).

Czyli jesli masz dzialajace logowanie Taskora na tym samym hostingu,
Makao moze uzyc tych samych ustawien z ../.env i nie musisz duplikowac hasel.

Integracja z przeslana baza fifi98:
- Gra czyta liste graczy z tabeli uzytkownicy (id, imie, nazwisko, email).
- Po zakonczeniu partii zapisuje wynik do makao_cba_matches.

Uwaga:
- To jest wersja offline (bot / local 2 osoby przy jednym ekranie).
- Logika kart zawiera: waleczne 2/3/K po kolorze lub figurze, 4 sumujaca kolejki,
  J z zadaniem 5-10, Q pik jako anulowanie, A zmiana koloru, K pik dodatkowy ruch.

Jesli pojawi sie SQLSTATE[HY000] [1045] Access denied:
- sprawdz, czy host to localhost,
- sprawdz, czy user/haslo sa od tej samej bazy,
- najlepiej zostaw dane DB w ../.env i nie ustawiaj recznie innego config.php.
