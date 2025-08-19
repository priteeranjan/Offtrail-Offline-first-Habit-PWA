# Offtrail — Offline-first Habit Tracker (PWA)

A lightweight habits tracker that **works fully offline**, installs to your home screen, and syncs via an outbox pattern when online.

## Stack
- Vite + Vanilla JavaScript
- IndexedDB via [`idb`](https://github.com/jakearchibald/idb)
- Service Worker via Workbox (runtime caching + offline nav fallback)
- PWA Manifest + install prompt

## Features
- Add habits with weekly targets
- One-tap daily logs; recent history
- Offline by default; data persisted locally
- Outbox queue ready for real sync endpoints

## Getting Started
```bash
npm install
npm run dev
# open http://localhost:5173
```
To build:
```bash
npm run build
npm run preview
```

## Notes
- `public/sw.js` uses **runtime caching** instead of precache to keep setup simple with Vite’s hashed assets. It still works offline after first load.
- Replace the `trySync()` function in `src/main.js` with real API calls if/when you add a backend.
- Icons are simple placeholders generated for you.

## License
MIT
