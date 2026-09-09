# Performance Management System (PMS)

A commercial-grade, international Performance Management System built with a **Node.js + TypeScript + Express + Sequelize** REST API (`api/`) and a **Vue 3 + TypeScript + Vite** web client (this package root).

> Feature scope, module inventory, API surface, and data model are documented in [`docs/FEATURES.md`](docs/FEATURES.md).

## Repository layout

```
.
├── api/        # Backend REST API (Express, Sequelize, MySQL)
├── docs/       # FEATURES.md — definitive feature specification
└── src/        # Frontend (Vue 3 + TS + Vite + Element Plus) — scaffold installed in this pass
```

Frontend feature pages are scaffolded only in this pass; they ship in a later pass. The dev/test/build toolchain is fully wired.

## Quick start

### 1. Backend

```bash
cd api
cp .env.example .env        # edit credentials as needed
npm install
npm run seed                # create + sync + seed DB (roles, permissions, admin user)
npm run dev                 # or: npm run build && npm start
```

Dependencies: Node 20+, MySQL (XAMPP recommended on Windows).

After bootstrapping:

- API base: `http://localhost:8000/api/v1`
- Swagger UI: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
- Seeded admin: `admin@pms.local` / `ChangeMe123!`

Run quality gates:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

### 2. Frontend

```bash
npm install                 # from repo root
npm run dev                 # http://localhost:5173 (proxies /api to :8000)
```

Frontend gates:

```bash
npm run typecheck
npm run lint
npm test
npm run build               # typecheck + production build
```

Environment:

- `.env.development` → `VITE_API_BASE_URL=http://localhost:8000/api/v1`
- `.env.production` → `VITE_API_BASE_URL=/api/v1` (reverse-proxied in production)

## Frontend stack

- Vue 3 (`<script setup>`) + TypeScript + Vite 5
- Vue Router, Pinia, vue-i18n
- Element Plus (full import) + Element Plus icons
- Axios (auth interceptors, tokens in localStorage)
- dayjs, @vueuse/core, Sass
- Vitest + @vue/test-utils (unit tests next to `src/**/__tests__/`), ESLint + Prettier

Key frontend entry points:

- `src/main.ts` — app bootstrap (router, pinia, i18n, Element Plus)
- `src/router/index.ts` — routes
- `src/api/http.ts` + `src/api/token.ts` — Axios instance and token storage
- `src/stores/auth.ts` — auth store (login/fetchMe/logout)
- `src/i18n/index.ts` — locales (en/fr; more to come)
- `src/utils/format.ts` — dayjs formatters

## API smoke cheat-sheet

```bash
# login
curl -s http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pms.local","password":"ChangeMe123!"}'
# authenticated call
curl -s http://localhost:8000/api/v1/system/info -H "Authorization: Bearer <token>"
```