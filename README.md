# Performance Management System (PMS)

A commercial-grade, international Performance Management System with a
**Node.js + TypeScript + Express + Sequelize + MySQL** API (`api/`) and a
**Vue 3 + TypeScript + Vite** web client (repository root).

One canonical module per capability — goals/OKRs, reviews, feedback,
one-on-ones, engagement surveys, time off, compensation, onboarding,
calibration (9-box), documents, integrations and analytics — so features are
never duplicated across products.

## Documentation

| Document | Contents |
|----------|----------|
| [`docs/FEATURES.md`](docs/FEATURES.md) | Definitive feature specification and module map |
| [`docs/PRODUCT_DESIGN.md`](docs/PRODUCT_DESIGN.md) | Product ownership matrix and scope decisions |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Themes, i18n, RTL, app shell and API client |
| [`docs/GRAPHQL.md`](docs/GRAPHQL.md) | Read-only GraphQL schema and examples |
| [`docs/QUEUES.md`](docs/QUEUES.md) | BullMQ jobs, inline fallback and webhook events |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Docker, Kubernetes, CI/CD, monitoring and runbooks |

## Repository layout

```
.
├── api/                 # REST + GraphQL API (Express, Sequelize, MySQL)
│   ├── src/modules/     # One folder per capability
│   ├── src/graphql/     # Read-only GraphQL endpoint
│   ├── src/queues/      # BullMQ jobs with inline fallback
│   ├── docker-compose.yml
│   └── Dockerfile
├── deploy/
│   ├── k8s/             # Kustomize manifests (API, web, MySQL, Redis, HPA, ingress)
│   └── monitoring/      # Prometheus scrape config + Grafana provisioning
├── docker/              # nginx config for the SPA image
├── docs/                # Product, frontend, GraphQL, queue and deployment docs
├── src/                 # Vue 3 web client (app shell, theming, i18n, API client)
├── Jenkinsfile          # Jenkins CI/CD pipeline
└── .github/workflows/   # GitHub Actions CI
```

## Quick start

Dependencies: Node 20+, MySQL 8+ (XAMPP works on Windows), Redis 7+ optional.

### 1. API

```bash
cd api
cp .env.example .env        # set DB credentials and JWT secrets
npm ci
npm run db:reset            # sync schema + seed roles, permissions, admin
npm run dev                 # http://localhost:8000
```

Endpoints after boot:

- REST base: `http://localhost:8000/api/v1`
- Swagger UI: `http://localhost:8000/docs`
- GraphQL: `http://localhost:8000/graphql`
- Health: `http://localhost:8000/health`
- Metrics: `http://localhost:8000/metrics`
- Seeded admin: `admin@pms.local` / `ChangeMe123!` — change immediately

### 2. Web

```bash
npm ci
npm run dev                 # http://localhost:5173 (proxies /api to :8000)
```

Environment:

- `.env.development` → `VITE_API_BASE_URL=http://localhost:8000/api/v1`
- `.env.production` → `VITE_API_BASE_URL=/api/v1` (reverse-proxied)

### 3. Full stack with Docker

```bash
cd api
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Web | http://localhost:8080 |
| API / Swagger | http://localhost:8000 / http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for Kubernetes, CI/CD and
production hardening.

## Platform capabilities

- **Multi-tenancy** — `orgId` scoping and `x-tenant-id`, per-tenant settings
- **Security** — JWT access/refresh, bcrypt, RBAC permission catalog, Helmet,
  CORS, rate limiting, slow-down, HPP, audit trail
- **Internationalisation** — API and UI in `en`, `fr`, `es`, `de`, `hi`, `zh`,
  `ar`; RTL support; locale-aware dates/numbers
- **Theming** — light, dark, midnight and high-contrast, plus system mode
- **Observability** — structured Winston logs, Prometheus metrics, health probes,
  Grafana dashboard, audit log
- **Integrations** — tenant API keys, signed webhooks, delivery history
- **Background work** — BullMQ queue with automatic inline fallback

## API conventions

- Envelope: `{ success, data, meta, message }`
- Validation: Zod schemas; failures return translated i18n keys
- Lists: pagination/filtering plus `X-Total-Count`
- Deletes: `204 No Content`
- Auth: `Authorization: Bearer <token>`; tenant: `x-tenant-id`
- Errors: `{ success: false, error: { message, code, details } }`

## Quality gates

```bash
# API
cd api
npm run typecheck && npm run lint && npm test && npm run build

# Web
npm run typecheck && npm run lint && npm test && npm run build
```

Current suites: 37 API tests (7 suites) and 23 web tests (5 suites), plus
locale parity checks for all seven languages.

## Scripts

| Command | Location | Purpose |
|---------|----------|---------|
| `npm run dev` | `api/`, root | Development servers |
| `npm run build` | `api/`, root | Production build |
| `npm run typecheck` | `api/`, root | TypeScript checks |
| `npm run lint` | `api/`, root | ESLint |
| `npm test` | `api/`, root | Jest / Vitest |
| `npm run db:sync` | `api/` | Sync schema |
| `npm run db:seed` | `api/` | Seed roles, permissions, admin |
| `npm run db:reset` | `api/` | Sync + seed |
| `npm run format` | `api/`, root | Prettier |

## License

Proprietary — all rights reserved.
