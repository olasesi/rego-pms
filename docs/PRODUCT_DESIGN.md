# Product Design — Rego PMS

> Design brief: build a **commercial, international, inclusive** performance & people platform that
> unifies the strongest capabilities of **Lattice**, **15Five**, **BambooHR** and **Betterworks** —
> with **no duplicated features**. Each capability has exactly one canonical home.

This document is the design authority. `docs/FEATURES.md` remains the implementation inventory.

---

## 1. Product positioning

| Product | Primary strength we adopt | What we deliberately do **not** copy |
|---|---|---|
| **Lattice** | Continuous performance, 1:1s, engagement surveys, calibration, growth | Standalone "Grow" LMS (we model growth through development plans + competencies) |
| **15Five** | Weekly check-ins, OKR alignment, manager effectiveness, eNPS | Duplicate "check-in" module (we extend existing **Goal check-ins**) |
| **BambooHR** | HRIS core: time off, onboarding/offboarding, documents, compensation, benefits | Full payroll engine (integration boundary, not built-in) |
| **Betterworks** | Enterprise OKRs, alignment, calibration, analytics | Separate OKR engine (we extend existing **Goals/Key Results**) |

**Dedupe rule:** one capability → one module. Overlapping features are merged into the richer
existing module rather than recreated.

---

## 2. Feature ownership matrix (deduplicated)

| Capability | Seen in | Canonical module in Rego PMS | Status |
|---|---|---|---|
| Auth, SSO-ready JWT, RBAC, audit | all | `auth`, `roles`, `admin` | ✅ existing |
| Employee records / directory | BambooHR, Lattice | `users`, `organizations`, `departments`, `teams` | ✅ existing |
| Goals / OKRs / key results / alignment | Lattice, 15Five, Betterworks | `goals` (+ `key-results`, `check-ins`) | ✅ existing |
| Weekly check-ins / confidence | 15Five | **merged into** `goals` check-ins (confidence 1–5, blockers) | ✅ existing |
| KPI / metrics tracking | Betterworks | `kpis` | ✅ existing |
| Review cycles, templates, 360° reviews | all | `reviewCycles`, `reviewTemplates`, `reviews` | ✅ existing |
| Continuous feedback / praise | Lattice, 15Five | `feedback` | ✅ existing |
| Recognition / points / badges | Lattice, 15Five | `recognitions` | ✅ existing |
| Development plans (IDP) | Lattice, 15Five | `developmentPlans` | ✅ existing |
| Competencies / skills / gap analysis | Lattice, Betterworks | `competencies` | ✅ existing |
| Notifications, email, digests | all | `notifications`, `jobs` | ✅ existing |
| Reports, dashboards, CSV/PDF export | all | `reports` | ✅ existing |
| **1:1 meetings, agendas, action items** | Lattice, 15Five | **`oneOnOnes`** (new) | 🆕 |
| **Engagement surveys & eNPS** | Lattice, 15Five | **`surveys`** (new) | 🆕 |
| **Time off / leave & holidays** | BambooHR | **`timeOff`** (new) | 🆕 |
| **Compensation, bands, pay reviews** | BambooHR, Lattice | **`compensation`** (new) | 🆕 |
| **Onboarding / offboarding checklists** | BambooHR | **`onboarding`** (new) | 🆕 |
| **Calibration sessions & 9-box** | Lattice, Betterworks | **`calibration`** (new) | 🆕 |
| **Documents & e-acknowledgements** | BambooHR | **`documents`** (new) | 🆕 |
| **API keys, webhooks, event deliveries** | platform | **`integrations`** (new) | 🆕 |
| Payroll processing, tax filing | BambooHR-adjacent | *out of scope* — integration boundary | — |
| Standalone LMS / course catalog | Lattice Grow | *out of scope* — development plans cover growth | — |
| Benefits enrollment / carrier sync | BambooHR | *roadmap* — compensation module is the anchor | — |
| Succession planning | Betterworks | *roadmap* — calibration + 9-box is the anchor | — |

---

## 3. New module specifications

### 3.1 One-on-Ones (`oneOnOnes`)
**Purpose:** recurring manager↔employee conversations with shared agendas and action items.
- `OneOnOneSeries`: manager, employee, cadence, next meeting, status. Unique per pair per org.
- `OneOnOneMeeting`: scheduled time, status, notes (manager/employee/shared).
- `OneOnOneAgendaItem`: talking points, wins, blockers, feedback, action items; private flag; due date.
- **Endpoints:** series CRUD, `/series/:id/meetings`, `/meetings/:id` + agenda CRUD, `/mine`.
- **Rules:** only manager/employee/HR can view a series; private items visible only to author + manager.

### 3.2 Engagement Surveys & eNPS (`surveys`)
**Purpose:** pulse/engagement/eNPS campaigns with anonymous responses and analytics.
- `Survey` (type: engagement | enps | pulse | custom), audience JSON, anonymous flag, lifecycle.
- `SurveyQuestion` (rating | enps | text | single_choice | multi_choice | boolean).
- `SurveyResponse` (nullable user for anonymity, department snapshot for segmentation).
- `SurveyAnswer`.
- **Endpoints:** survey + question CRUD, `launch`/`close`, `submit`, `analytics`.
- **Analytics:** participation rate, eNPS score (promoters − detractors), rating averages,
  choice distributions, department segmentation.

### 3.3 Time Off & Leave (`timeOff`)
**Purpose:** PTO/leave policies, balances, requests, approvals, holidays.
- `LeaveType` (paid, accrual, default days, color), `LeaveBalance` (per user/type/year),
  `LeaveRequest` (pending→approved/rejected/cancelled), `Holiday` (region-aware).
- **Endpoints:** types + holidays CRUD, `balances/mine`, `requests` (submit/cancel/approve/reject),
  team calendar.
- **Rules:** approving decrements balance atomically; cancellation restores it.

### 3.4 Compensation (`compensation`)
**Purpose:** salary/bonus/equity records, bands, and budgeted pay review cycles.
- `CompensationBand` (level, min/mid/max, currency, country), `CompensationRecord`,
  `PayReviewCycle`, `PayReviewDecision`.
- **Endpoints:** bands/records CRUD, `records/mine`, pay-review cycles + decisions + approve.
- **Rules:** employees see only their own records; managers see direct reports (read);
  HR/admin manage. Currency-aware; no payroll disbursement.

### 3.5 Onboarding & Offboarding (`onboarding`)
**Purpose:** repeatable checklists for joins and exits.
- `OnboardingTemplate`, `OnboardingTemplateTask` (assignee role: employee/manager/hr/it).
- `OnboardingAssignment`, `OnboardingTaskProgress`.
- **Endpoints:** templates + tasks CRUD, assign, `assignments/mine`, task completion.
- **Rules:** auto-creates progress rows from template tasks on assignment.

### 3.6 Calibration & 9-Box (`calibration`)
**Purpose:** fair, consistent review outcomes across managers.
- `CalibrationSession` (per review cycle, facilitator), `CalibrationParticipant`
  (performance × potential → 9-box, proposed/final rating, notes).
- **Endpoints:** session CRUD, participants, `matrix` (9-box distribution + rating spread).
- **Rules:** final ratings are immutable after session completion (audit logged).

### 3.7 Documents & e-Acknowledgements (`documents`)
**Purpose:** policies, contracts, and letters with acknowledgement tracking.
- `DocumentTemplate` (versioned content, requires acknowledgement),
  `EmployeeDocument` (sent → acknowledged → expired).
- **Endpoints:** template CRUD, send to employee, `mine`, `acknowledge`.
- **Rules:** acknowledgement records timestamp + IP; immutable after signing.

### 3.8 Integrations (`integrations`)
**Purpose:** machine access and outbound events for a commercial ecosystem.
- `ApiKey` (hashed secret, prefix, scopes, expiry, revocation), `Webhook`, `WebhookDelivery`.
- **Endpoints:** API key create (secret shown once), revoke; webhook CRUD, `test`, deliveries.
- **Rules:** keys hashed with SHA-256; webhook payloads signed `X-PMS-Signature` (HMAC-SHA256).

---

## 4. Cross-cutting platform capabilities

| Area | Decision |
|---|---|
| **API styles** | REST (canonical, OpenAPI) **+ GraphQL** (`/graphql`, read-oriented) |
| **Async work** | BullMQ on Redis for email, notifications, exports, webhooks; inline fallback when Redis is absent |
| **i18n** | en, fr, es, de, hi, zh, ar (RTL) — API messages + UI |
| **Themes** | Light, Dark, Midnight, High-contrast + accent colors; CSS variables; RTL |
| **Accessibility** | WCAG 2.1 AA tokens, focus rings, reduced-motion, keyboard nav |
| **Testing** | Jest unit/integration (API), Vitest + @vue/test-utils (web), contract checks |
| **Docs** | OpenAPI at `/docs`, GraphQL at `/graphql`, architecture + runbooks in `docs/` |
| **Deployment** | Docker, docker-compose, Kubernetes (kustomize), Jenkins, GitHub Actions |
| **Observability** | Prometheus `/metrics`, Grafana dashboards, structured Winston logs, health/readiness probes |
| **Security** | Helmet, CORS allowlist, rate limiting, RBAC, audit trail, GDPR export/erase |

---

## 5. Delivery phases

| Phase | Scope | Status |
|---|---|---|
| **1** | Core platform + performance modules (existing) | ✅ shipped |
| **2** | 1:1s, surveys/eNPS, time off, compensation, onboarding, calibration, documents, integrations | 🚧 in progress |
| **3** | GraphQL parity, event streaming, benefits, succession, mobile client | 🚧 foundation |
| **4** | Payroll connector, SSO/SAML, SCIM provisioning, AI summaries | ⏳ roadmap |

---

## 6. Non-goals (explicit)

- Payroll disbursement and statutory tax filing (connector only).
- A general-purpose LMS / course authoring.
- Benefits carrier EDI and COBRA administration.
- Recreating features already owned by an existing module (see dedupe rule).
