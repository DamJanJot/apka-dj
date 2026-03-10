# Bitbucket + CBA workflow (5 krokow)

## 1. Pierwszy import repo do Bitbucket

W Bitbucket (ekran "Import existing code"):

- `Old repository URL`: zostaw puste, jesli pushujesz lokalne repo recznie
- `Project name`: np. `DJ`
- `Repository name`: np. `dj-app`
- `Access level`: Private

Nastepnie lokalnie uruchom:

```bash
git remote remove origin

git remote add origin https://bitbucket.org/damjanjot/dj-app.git
git branch -M main
git push -u origin main
```

Jesli `origin` nie istnieje, pomin pierwszy wiersz.

## 2. Codzienna praca

```bash
git add .
git commit -m "krotki opis zmiany"
git push
```

## 3. Zbuduj paczke CBA

W katalogu repo uruchom:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-cba-package.ps1
```

Skrypt przygotuje/odswiezy:

- `cba_upload_package/public_html.zip`
- `cba_upload_package/laravel_core_no_vendor.zip`
- `cba_upload_package/laravel_core_vendor.zip`

## 4. Wgraj na CBA (WinSCP)

- `public_html.zip` -> rozpakuj do `public_html/`
- `laravel_core_no_vendor.zip` -> rozpakuj do `laravel_core/`
- `laravel_core_vendor.zip` -> rozpakuj do `laravel_core/vendor/`

## 5. Finalizacja po deployu

- phpMyAdmin: import `cba_upload_package/import_database.sql` (pierwszy deploy)
- Odpal setup:
  - ustaw sekret w `public_html/setup.php`
  - wejdz: `https://code-dj.pl/setup.php?secret=TWOJ_SEKRET`
  - usun `setup.php` z serwera
- Test logowania: `https://code-dj.pl/login`

## Zasady bezpieczenstwa

- Nie commituj produkcyjnego `.env` do repo.
- Trzymaj repo jako `Private`.
- Po deployu zawsze usuwaj `setup.php`.
