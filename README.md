---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure local env
cp .env.example .env.local

# Start development server
npm run dev

# Production build
npm run build && npm run preview
```

---

## 📂 Project Structure

```
src/
 ├─ components/     # Cards & widgets
 ├─ pages/          # Dashboard + placeholders
 └─ services/
     └─ mock.ts     # Mock data (can be replaced with real API calls)
```

---

## 🔌 API Integration

Instead of using mocks from `services/mock.ts`, connect your own backend:

- Replace mock requests with real API calls (Laravel, Express, etc.)
- Use Vite environment variables (e.g. `VITE_API_URL`)
- Make sure your backend handles **CORS**

Required env variables:

- `VITE_API_URL` - backend URL, e.g. `http://localhost:8000`
- `VITE_WEATHER_API_KEY` - OpenWeather API key for dashboard widgets

---

## ☁️ Deploy (Vercel)

1. Create a new project from this repo
2. Set build command:
   ```bash
   npm run build
   ```
3. Set output directory:
   ```
   dist
   ```

---

## 🛠 Tech Stack

- ⚡ [Vite](https://vitejs.dev/) — fast build tool
- ⚛ [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- 🎨 TailwindCSS (optional styling)
- 📊 Chart.js / Recharts (widgets & charts)

---

## 📜 License

MIT — feel free to use and modify.
