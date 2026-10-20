# Nyagah B. Kithinji Advocates — Client App

React frontend for managing legal matters, fee notes, and billing under Kenyan Advocates Remuneration law.

Backend API and deployment infrastructure are located in [nyagahK_azure_backend](https://github.com/guyo-halake/nyagahK_azure_backend).

## Tech Stack
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide Icons
- **Auth & Storage**: Supabase (PostgreSQL + S3)
- **Runtime**: Nginx Alpine

## Getting Started

### Local Development
```bash
cp .env.example .env.local
npm install
npm run dev
```
App runs at `http://localhost:3000`.

### Docker
```bash
docker compose up --build
```
Runs at `http://localhost:3001`.

## Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase public anon key
- `VITE_API_BASE_URL`: Backend API URL (`http://localhost:8000` for local dev)

## System Specifications
- **Client Architecture**: Single Page Application (SPA), React 18, TypeScript (strict mode)
- **Styling & Design System**: Tailwind CSS, responsive mobile-first grid, Lucide icons
- **State & Data Layer**: Client-side reactive stores, Supabase Auth + Postgres, Supabase S3 Storage
- **API Gateway Integration**: REST client connecting to FastAPI backend over HTTPS / TLS 1.3
- **Container Specs**: Linux amd64, non-privileged port 3000/80, zero-daemon lightweight footprint (< 40MB image)
- **Target Environments**: Node 20 LTS, Chromium >= 100, Firefox >= 100, Safari >= 15

## Build
```bash
npx tsc --noEmit   # type check
npm run build      # production build
```
