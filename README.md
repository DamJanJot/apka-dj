# apka-dj

Full-stack social platform built with React + TypeScript frontend and a Laravel API backend — featuring user profiles, friends, posts, and a real-time dashboard.

---

## ✨ Features

- 🔐 Authentication — register, login, session management (Laravel Sanctum)
- 👤 User profiles — avatar, name, edit profile
- 🤝 Friends — send/accept/reject friend requests, search users
- 💬 Messages — direct messaging between users
- 📋 Board — posts and activity feed
- 📰 News — RSS news feed widget
- 📊 Dashboard — weather, crypto prices, currency rates, gold prices
- 📈 Markets — financial charts and market data
- ⚙️ Settings — user preferences

---

## 🛠 Tech Stack

**Frontend**
- ⚡ [Vite](https://vitejs.dev/) — fast build tool
- ⚛ [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- 🎨 [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- 📊 [Chart.js](https://www.chartjs.org/) / [Recharts](https://recharts.org/)
- 🔗 [React Router v6](https://reactrouter.com/)
- 🌐 [Axios](https://axios-http.com/)

**Backend**
- 🐘 [Laravel](https://laravel.com/) (PHP) — REST API (`dj-api/`)
- 🔒 [Laravel Sanctum](https://laravel.com/docs/sanctum) — SPA cookie authentication
- 🗄️ MySQL / relational database

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- PHP ≥ 8.2, Composer
- MySQL

### Frontend

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env.local

# Start development server
npm run dev
```

### Backend (Laravel API)

```bash
cd dj-api

# Install PHP dependencies
composer install

# Copy and configure environment
cp .env.example .env
php artisan key:generate

# Run migrations
php artisan migrate

# Start API server
php artisan serve
```

### Run both concurrently

```bash
npm run start:full
```

---

## 🔧 Environment Variables

### Frontend (`.env.local`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Laravel backend URL | `http://localhost:8000` |
| `VITE_WEATHER_API_KEY` | OpenWeather API key | `your_key_here` |

### Backend (`dj-api/.env`)

Standard Laravel environment variables — database connection, app key, mail, etc. See `dj-api/.env.example`.

---

## 📂 Project Structure

```
apka-dj/
├── src/
│   ├── api/            # Axios client & API calls
│   ├── components/     # Reusable UI components & widgets
│   │   └── ui/         # Radix UI primitives
│   ├── context/        # AuthContext (session state)
│   ├── hooks/          # Custom React hooks
│   ├── layout/         # Sidebar, Topbar, Layout wrapper
│   ├── pages/          # Route-level pages
│   │   ├── Dashboard.tsx
│   │   ├── Friends.tsx
│   │   ├── Messages.tsx
│   │   ├── Profile.tsx
│   │   ├── Board.tsx
│   │   └── ...
│   ├── services/       # Mock data (dev fallback)
│   └── types.ts        # Shared TypeScript types
├── dj-api/             # Laravel backend
│   ├── app/
│   ├── routes/api.php
│   └── ...
├── .env.example
├── package.json
└── vite.config.mts
```

---

## ☁️ Deployment

### Frontend (Vercel / Netlify)

1. Set build command: `npm run build`
2. Set output directory: `dist`
3. Add environment variables (`VITE_API_URL`, `VITE_WEATHER_API_KEY`)

### Backend (VPS / shared hosting)

1. Upload `dj-api/` to your server
2. Configure `.env` with production DB credentials
3. Run `php artisan migrate --force`
4. Point your web server (Nginx/Apache) to `dj-api/public/`
5. Set `VITE_API_URL` on the frontend to your production API URL

---

## 🔮 Future Improvements

- [ ] Real-time notifications (WebSockets / Laravel Echo)
- [ ] Post reactions and comments
- [ ] Group chats
- [ ] Mobile-responsive redesign
- [ ] Dark / light theme toggle
- [ ] Unit and integration tests (Vitest + PHPUnit)

---

## 📜 License

MIT — feel free to use and modify.
