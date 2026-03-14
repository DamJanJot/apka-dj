# DJ Application

Monorepo aplikacji webowej z frontendem React + TypeScript (Vite) oraz backendem Laravel (`dj-api`).

## Moduly aplikacji

- Orbitum: glowny dashboard, tablica, wiadomosci, znajomi, rynki.
- Neuronetix: dashboard + podstawowe moduly komunikacji.
- Taskora: dashboard + integracja pod zadania i zespoly.
- Optivio: dashboard + moduly komunikacyjne.
- Grafiki: harmonogram pracy i widoki planowania.

Kazdy modul dziala w jednym shellu na wspolnym systemie logowania.

## Quick Start

### 1) Frontend (Vite)

```bash
npm install
npm run dev
```

Frontend domyslnie: `http://localhost:5173`

### 2) Backend (Laravel)

```bash
cd dj-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Backend domyslnie: `http://localhost:8000`

### 3) Start front + API razem

```bash
npm run start:full
```

## Konfiguracja frontendu

Plik `.env` (frontend):

```env
VITE_API_URL=http://localhost:8000
```

Jesli nie ustawisz `VITE_API_URL`, klient API fallbackuje do `http://localhost:8000`.

## Najwazniejsze trasy

- Orbitum: `/dashboard`, `/news`, `/markets`, `/messages`, `/friends`, `/board`, `/makao`
- Neuronetix: `/neuronetix/dashboard`, `/neuronetix/messages`, `/neuronetix/friends`, `/neuronetix/docs`
- Taskora: `/taskora/dashboard`, `/taskora/messages`, `/taskora/friends`, `/taskora/docs`
- Optivio: `/optivio/dashboard`, `/optivio/messages`, `/optivio/friends`, `/optivio/docs`
- Grafiki: `/grafiki/dashboard`, `/grafiki/week`, `/grafiki/month`, `/grafiki/summary`, `/grafiki/workplan`, `/grafiki/messages`, `/grafiki/friends`, `/grafiki/docs`

## Logowanie na Vercel (frontend)

Samo wrzucenie frontendu na Vercel nie wystarczy do logowania. Nie dodajesz loginu/hasla w panelu Vercel.

Potrzebujesz:

1. Dzialajacego backendu Laravel pod publicznym adresem HTTPS.
2. `VITE_API_URL` w Vercel ustawione na URL backendu (np. `https://api.twoja-domena.pl`).
3. Poprawnych ustawien CORS i Sanctum po stronie `dj-api`.
4. Poprawnych cookie/session dla cross-domain (HTTPS).

Typowe ustawienia backendu (env) dla frontu na innej domenie:

```env
APP_URL=https://api.twoja-domena.pl
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
SANCTUM_STATEFUL_DOMAINS=twoj-frontend.vercel.app
```

Po zmianach w backendzie wyczysc cache configu:

```bash
php artisan config:clear
php artisan cache:clear
```

## Polaczenie ze wspolna baza online

Zeby Orbitum + Optivio + pozostale moduly dzialaly na tej samej bazie online, backend `dj-api` musi byc uruchomiony z poprawnymi zmiennymi srodowiskowymi.

Minimalny zestaw na hostingu (Railway/Render):

```env
APP_URL=https://twoj-backend.up.railway.app
DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...

# albo zamiast powyzszych: DB_URL / DATABASE_URL / MYSQL_URL
FRONTEND_ORIGINS=https://twoj-frontend.vercel.app
SANCTUM_STATEFUL_DOMAINS=twoj-frontend.vercel.app
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
```

Po deployu backendu uruchom migracje na tej online bazie:

```bash
php artisan migrate --force
```

Frontend (Vercel) musi miec:

```env
VITE_API_URL=https://twoj-backend.up.railway.app
```

Bez tego frontend moze laczyc sie z nieprawidlowym API i bedzie wygladac jakby dane nie byly wspolne.

## Struktura repo

```text
.
|- src/                # frontend React
|  |- components/
|  |- context/
|  |- layout/
|  |- pages/
|  |- api/
|  |- lib/
|  |- services/
|- dj-api/             # backend Laravel
|  |- app/
|  |- routes/
|  |- database/
|  |- config/
```

## Build

```bash
npm run build
npm run preview
```

## Deploy (Bitbucket + CBA)

Najprostszy powtarzalny flow jest opisany w:

- `DEPLOY-BITBUCKET-CBA.md`

Szybkie pakowanie paczki pod CBA:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-cba-package.ps1
```

Skrypt odswieza `cba_upload_package/` i tworzy ZIPy do uploadu przez WinSCP.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, React Router
- UI: Radix UI, Lucide Icons
- Wykresy: Chart.js, Recharts
- HTTP: Axios (XSRF + cookies)
- Backend: Laravel (PHP)
