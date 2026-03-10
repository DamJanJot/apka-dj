DJ App - CBA deployment package
=================================

PLIKI:
- public_html/      → wgraj zawartosc do public_html na serwerze
- laravel_core/     → wgraj obok public_html (poziom wyzej)
- import_database.sql → importuj przez phpMyAdmin (tylko raz, przy pierwszym deployu)

OCZEKIWANA STRUKTURA NA SERWERZE:
  /public_html/        (pliki statyczne React + index.php + .htaccess + setup.php)
  /laravel_core/       (caly backend Laravel)

=================================
KROKI DEPLOYMENTU
=================================

KROK 1: Wgraj pliki przez WinSCP
  - zawartosc cba_upload_package/public_html/   → public_html/ na serwerze
  - zawartosc cba_upload_package/laravel_core/  → laravel_core/ na serwerze
  (plik .env jest juz skonfigurowany i jest w laravel_core/)

KROK 2: Importuj baze danych przez phpMyAdmin
  - Wejdz w panel CBA → phpMyAdmin
  - Wybierz baze: fifi98
  - Import → wybierz plik: import_database.sql
  - Kliknij Go / Uruchom
  (Jesli tabele juz istnieja, mozesz pominac - "IF NOT EXISTS" jest uzyty)

KROK 3: Ustaw sekret w setup.php i wgraj go
  - Otworz public_html/setup.php
  - Zmien SETUP_SECRET na swoje haslo, np: 'MojeHaslo123'
  - Wgraj na serwer do public_html/setup.php

KROK 4: Odwiedz setup.php w przegladarce
  https://code-dj.pl/setup.php?secret=MojeHaslo123
  (zmien MojeHaslo123 na to co ustawilesdo SETUP_SECRET)
  Skrypt wykona: config:clear, cache:clear, migrate --force, storage:link

KROK 5: SKASUJ setup.php z serwera!
  Po udanym setupie usun plik public_html/setup.php przez WinSCP!

KROK 6: Sprawdz aplikacje
  https://code-dj.pl/login

=================================
DANE BAZY (juz skonfigurowane w .env):
  DB_HOST=81.171.31.232
  DB_DATABASE=fifi98
  DB_USERNAME=fifa98
  Uwierzytelnianie: zgodne z .env

SESJE I CORS (juz ustawione w .env):
  SANCTUM_STATEFUL_DOMAINS=code-dj.pl,www.code-dj.pl
  SESSION_DOMAIN=code-dj.pl
  SESSION_SECURE_COOKIE=true

=================================
UWAGI TECHNICZNE:
- public_html/.htaccess: routing SPA + Laravel API na jednej domenie
- public_html/index.php: zaladuje Laravela z ../laravel_core
- Frontend zbudowany z VITE_API_URL=/ (ten sam host)
- CACHE_STORE=file (brak Redis na shared hostingu)
- APP_DEBUG=false (produkcja)
