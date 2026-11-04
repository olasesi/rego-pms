# Deployment Guide

This guide covers local development, the single-host Docker stack, Kubernetes,
CI/CD, monitoring and operational runbooks.

---

## 1. Prerequisites

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 20 LTS+ | API and web build |
| MySQL | 8.0+ | utf8mb4 required |
| Redis | 7+ | Optional; enables the BullMQ queue |
| Docker | 24+ | Container builds |
| Kubernetes | 1.27+ | Production manifests (optional) |
| Jenkins | 2.4xx | Optional CI/CD |

---

## 2. Configuration

Copy `api/.env.example` to `api/.env` and set at minimum:

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | yes | `development` / `test` / `staging` / `production` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | yes | MySQL connection |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | yes | ≥16 chars; use 48 random bytes |
| `APP_URL`, `FRONTEND_URL`, `CORS_ORIGINS` | yes (prod) | Comma-separated allowlist |
| `REDIS_URL` | no | `redis://host:6379`; empty → inline jobs |
| `SUPPORTED_LOCALES` | no | `en,fr,es,de,hi,zh` |
| `ENABLE_METRICS` | no | `true` exposes `/metrics` |
| `SMTP_*` | no | Email delivery |
| `QUEUE_CONCURRENCY` | no | Worker concurrency (default 5) |
| `SENTRY_DSN` | no | Reserved for error reporting |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The API validates its environment with Zod at boot and refuses to start on
invalid configuration.

---

## 3. Local development

```bash
# terminal 1 — API
cd api
npm ci
npm run dev                 # http://localhost:8000

# terminal 2 — web
npm ci
npm run dev                 # http://localhost:5173 (proxies /api)
```

Bootstrap the database on first boot (the server seeds idempotently):

```bash
cd api
npm run db:sync
npm run db:seed
```

Seeded admin: `admin@pms.local` / `ChangeMe123!` (change immediately).

Quality gates:

```bash
cd api && npm run typecheck && npm run lint && npm test && npm run build
npm run typecheck && npm run lint && npm test && npm run build   # root
```

---

## 4. Docker Compose (single host)

`api/docker-compose.yml` runs MySQL, Redis, the API, the web client,
Prometheus and Grafana.

```bash
cd api
docker compose up -d --build
docker compose ps
docker compose logs -f api
```

| Service | URL |
|---------|-----|
| Web | http://localhost:8080 |
| REST API | http://localhost:8000/api/v1 |
| Swagger | http://localhost:8000/docs |
| GraphQL | http://localhost:8000/graphql |
| Health | http://localhost:8000/health |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (`admin` / `$GRAFANA_PASSWORD`) |

Before exposing the stack, create `api/.env` (or export variables) with strong
`JWT_*`, `DB_*` and `GRAFANA_*` values. The compose defaults are development
secrets only.

Stop and remove volumes:

```bash
docker compose down          # keep data
docker compose down -v       # destroy data
```

---

## 5. Kubernetes

Manifests live in `deploy/k8s` and are managed with Kustomize.

```bash
# 1. Create the namespace and configuration
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml

# 2. Create secrets (never commit real values)
kubectl -n pms create secret generic pms-api-secrets \
  --from-literal=DB_USER=pms \
  --from-literal=DB_PASSWORD='<strong-password>' \
  --from-literal=JWT_ACCESS_SECRET="$(openssl rand -hex 48)" \
  --from-literal=JWT_REFRESH_SECRET="$(openssl rand -hex 48)" \
  --from-literal=SEED_ADMIN_EMAIL=admin@example.com \
  --from-literal=SEED_ADMIN_PASSWORD='<strong-password>'

kubectl -n pms create secret generic pms-mysql-secrets \
  --from-literal=MYSQL_DATABASE=pms \
  --from-literal=MYSQL_USER=pms \
  --from-literal=MYSQL_PASSWORD='<strong-password>' \
  --from-literal=MYSQL_ROOT_PASSWORD='<strong-password>'

# 3. Deploy everything else
kubectl apply -k deploy/k8s
kubectl -n pms rollout status deployment/pms-api
```

What is included:

- `mysql.yaml` — single-writer StatefulSet with a 20 GiB PVC and probes
- `redis.yaml` — Redis 7 with AOF persistence and a 5 GiB PVC
- `api.yaml` — 3 replicas, startup/readiness/liveness probes, HPA (3–12,
  CPU 70%), PodDisruptionBudget (`minAvailable: 2`), non-root security context
- `web.yaml` — 2 nginx replicas serving the SPA
- `ingress.yaml` — TLS host routing `/api`, `/graphql`, `/docs`, `/health`,
  `/metrics` to the API and everything else to the web client
- `configmap.yaml` — non-secret runtime configuration

Promote a new image without editing YAML:

```bash
kubectl -n pms set image deployment/pms-api api=ghcr.io/olasesi/rego-pms/api:<sha>
kubectl -n pms set image deployment/pms-web web=ghcr.io/olasesi/rego-pms/web:<sha>
```

Notes:

- Replace `pms.example.com` in `configmap.yaml` and `ingress.yaml`.
- The `cert-manager.io/cluster-issuer` annotation assumes cert-manager is
  installed; remove it to use an existing TLS secret.
- The API performs schema sync on boot (`alter: false`). For destructive
  migrations, run them as a separate Job before rolling out.
- MySQL and Redis manifests are suitable for a single-zone starter deployment;
  use a managed database and Redis for multi-zone production.

---

## 6. CI/CD

### Jenkins

The root `Jenkinsfile` runs:

1. Install (API + web in parallel)
2. Typecheck + lint
3. Tests
4. Build
5. Docker image build (API + web)
6. Trivy scan (HIGH/CRITICAL, non-blocking)
7. Push to GHCR (`develop`, `main`, `master`, tags)
8. `kubectl apply -k` + `set image` + rollout on `main`/`master`/tags

Required credentials: `ghcr-credentials`, `pms-kubeconfig`. Agent needs a
`node20` tool, Docker and `kubectl`.

### GitHub Actions

`.github/workflows/ci.yml` runs on pushes and pull requests to `develop`,
`main` and `master`:

- API job: install → typecheck → lint → tests → build → artifact
- Web job: install → typecheck → lint → tests → build → artifact
- Images job (push only): build/push `ghcr.io/<repo>/api` and `/web`, then
  Trivy scan
- Manifests job: renders `deploy/k8s` with Kustomize

`GITHUB_TOKEN` provides GHCR access; enable package write permissions in the
repository settings.

---

## 7. Monitoring & logging

- **Health:** `GET /health` returns `200` when the DB is reachable, `503`
  otherwise. Use it for load balancer and Kubernetes probes.
- **Metrics:** `GET /metrics` (Prometheus format) exposes
  `pms_http_requests_total`, `pms_http_request_duration_seconds`,
  `pms_db_query_duration_seconds` and Node.js process metrics.
- **Grafana:** the `PMS API Overview` dashboard is provisioned automatically
  from `deploy/monitoring/grafana/dashboards`.
- **Logs:** Winston JSON logs to stdout and rotating files in `LOG_DIR`.
  Scrape stdout with your platform's log agent (Loki, CloudWatch, ELK).
- **Audit:** privileged mutations are written to the audit log; failures are
  logged but never block the request.

Prometheus scrape config: `deploy/monitoring/prometheus.yml`.

---

## 8. Backup & restore

```bash
# Backup
docker exec pms-mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction pms' > pms-$(date +%F).sql

# Restore
docker exec -i pms-mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" pms' < pms-2026-01-01.sql
```

Redis holds only transient queue data; losing it drops in-flight jobs but does
not corrupt primary data.

---

## 9. Production checklist

- [ ] Strong, unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- [ ] TLS terminated at the ingress/load balancer
- [ ] `CORS_ORIGINS` restricted to the real frontend origin
- [ ] Seeded admin password rotated; MFA enforced at the identity layer
- [ ] MySQL and Redis backed up and monitored
- [ ] `/metrics` and `/docs` restricted to the internal network if required
- [ ] Log aggregation and alerting on 5xx rate, latency and DB availability
- [ ] Resource requests/limits and HPA tuned to observed traffic
- [ ] Dependency and container scans reviewed (Trivy, `npm audit`)
