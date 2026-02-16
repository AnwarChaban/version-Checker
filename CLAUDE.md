# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Run backend (:3001) + frontend (:5173) concurrently with hot-reload
npm run dev:server   # Backend only (tsx watch)
npm run dev:client   # Frontend only (Vite)
npm run build        # Build client (Vite) then server (tsc)
npm start            # Run production build (node dist/server/index.js)
npx tsc --noEmit     # Type-check entire project
```

Docker: `docker-compose up --build`

No test framework is configured yet.

## Architecture

Full-stack TypeScript monorepo — Express backend + React/Vite frontend, single `package.json`.

**Data flow:** Scrapers fetch latest versions from vendor websites → cached in SQLite → compared (semver) against customer device versions from NinjaOne API (or mock data) → served via REST API → rendered in React dashboard. A cron scheduler (`node-cron`) runs checks periodically and sends webhook/Slack notifications for available updates.

**Two TypeScript configs:** `tsconfig.json` (client, ESNext/bundler) and `tsconfig.server.json` (server, CommonJS output to `dist/`).

**Dev proxy:** Vite proxies `/api/*` to `http://localhost:3001`. In production, Express serves the built React app as static files from `client/dist/`.

### Backend (`server/`)

- `index.ts` — Express setup, route mounting, cron scheduler, static file serving
- `config.ts` — All env vars loaded here. `useNinjaOne` is derived (true when `NINJAONE_API_KEY` is set)
- `db.ts` — SQLite via `better-sqlite3` with WAL mode. Tables: `version_cache`, `check_history`, `settings`. DB at `data/versions.db`
- `routes/` — `GET /api/products`, `POST /api/check`, `GET|PUT /api/settings`
- `services/version-fetcher.ts` — Orchestrates all scrapers, caches results, falls back to cached data on failure
- `services/ninjaone.ts` — NinjaOne API client with automatic mock fallback when no API key is configured
- `services/comparator.ts` — Semver comparison with normalization for vendor-specific formats (Synology build numbers, Sophos MR suffixes)
- `services/notifier.ts` — Console, webhook, and Slack notifications
- `scrapers/` — One file per product (synology, sophos, unifi, proxmox-ve, proxmox-backup, teamviewer). Each exports a function returning `{ version, url }`
- `mocks/ninjaone-data.ts` — 4 mock customers with 10 devices using deliberately outdated versions

### Frontend (`client/`)

- React 18 SPA with inline styles (no CSS framework), German UI
- `App.tsx` — Fetches products on mount, auto-refreshes every 60s. Grid layout (4-5 tiles per row)
- `components/ProductCard.tsx` — Per-product tile with color-coded left border, click to expand/collapse customer details
- `components/CustomerList.tsx` — Nested customer → device listing
- `components/StatusBadge.tsx` — Status pills (green/orange/red/gray)
- `api.ts` — Typed fetch wrappers for all API endpoints

## Adding a New Product Scraper

1. Create `server/scrapers/<product>.ts` exporting `async function fetch<Name>Version(): Promise<{ version: string; url: string }>`
2. Register it in `server/services/version-fetcher.ts`: add to `scrapers` map and `productNames` map
3. Add mock devices using the new product key in `server/mocks/ninjaone-data.ts`

## Environment Variables

Configured in `.env` (see `.env.example`). All loaded via `server/config.ts`.

- `NINJAONE_API_URL` — NinjaOne API base URL (default: `https://eu.ninjarmm.com`)
- `NINJAONE_CLIENT_ID` / `NINJAONE_CLIENT_SECRET` / `NINJAONE_API_KEY` — NinjaOne credentials. If `NINJAONE_API_KEY` is unset, app uses mock data automatically
- `PORT` — Server port (default: `3001`)
- `CHECK_CRON` — Cron expression for scheduled checks (default: `0 */4 * * *`)
- `WEBHOOK_URL` — Generic webhook for update notifications
- `SLACK_WEBHOOK_URL` — Slack webhook for update notifications

## Key Types

- `UpdateStatus`: `'up-to-date' | 'update-available' | 'major-update' | 'unknown'`
- `VersionInfo`: product + latestVersion + releaseUrl + checkedAt
- `ProductStatus`: full product state with nested customers/devices for the API response
- `UpdateNotification`: used across comparator → notifier pipeline
