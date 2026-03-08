# DJ Application

Monorepo aplikacji webowej z frontendem React + TypeScript (Vite) oraz backendem Laravel (`dj-api`).

Aktualny projekt to shell z kilkoma modulami/aplikacjami:

- Orbitum
- Neuronetix
- Taskora
- Optivio
- Grafiki (planner, dawne trasy `chic` maja redirect)

## Quick Start

### 1) Frontend (Vite)

```bash
npm install
npm run dev
```

Frontend domyslnie uruchamia sie na `http://localhost:5173`.

### 2) Backend (Laravel)

```bash
cd dj-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Backend domyslnie uruchamia sie na `http://localhost:8000`.

### 3) Uruchomienie obu serwisow naraz

Po instalacji zaleznosci frontendu:

```bash
npm run start:full
```

Skrypt uruchamia Vite oraz `php artisan serve` w `dj-api`.

## Konfiguracja (.env)

Frontend korzysta z:

- `VITE_API_URL` - adres backendu, np. `http://localhost:8000`

Domyslnie klient API i tak fallbackuje do `http://localhost:8000`, ale zalecane jest jawne ustawienie zmiennej.

## Najwazniejsze trasy (frontend)

- `/dashboard`, `/news`, `/markets`, `/messages`, `/friends`, `/board`, `/makao`
- `/neuronetix/dashboard`
- `/taskora/dashboard`
- `/optivio/dashboard`
- `/grafiki/dashboard`
- `/grafiki/week`
- `/grafiki/month`
- `/grafiki/summary`
- `/grafiki/workplan`
- `/grafiki/messages`
- `/grafiki/friends`
- `/grafiki/docs`

Kompatybilnosc: `/chic` i `/chic/*` przekierowuje na `/grafiki/dashboard`.

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

## Build i preview

```bash
npm run build
npm run preview
```

## Tech Stack

- Frontend: React 18, TypeScript, Vite, React Router
- UI: Radix UI, Lucide Icons
- Wykresy: Chart.js, Recharts
- HTTP: Axios (z obsluga XSRF/cookies)
- Backend: Laravel (PHP)

## Uwagi

- Projekt wymaga poprawnej konfiguracji CORS i cookies po stronie Laravel przy pracy lokalnej frontend-backend.
- W repo sa assets brandowe dla wielu modulow (Orbitum, Neuronetix, Taskora, Optivio, Grafiki).
