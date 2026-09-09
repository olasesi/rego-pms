# Performance Management System (PMS) — Feature Specification

This document is the **source of truth** for the commercial PMS product built in this
repository. It drives the API design (`/api`) and will drive the Vue frontend (root folder).

> Scope philosophy: the product is **commercial**, **international** and must serve
> multiple organizations, cultures, languages, timezones and regulatory contexts.

---

## 1. Core Platform

| Area | Features |
|------|----------|
| **Multi-tenancy** | Organizations (tenants), isolated data, `x-tenant-id` scoping, per-tenant settings |
| **Internationalization** | API + UI localisation (i18n), `Accept-Language`, RTL-ready, locale-aware dates/numbers/currencies |
| **Timezones** | Per-user timezone, UTC storage, localised display |
| **Security** | JWT (access + rotating refresh tokens), bcrypt hashing, RBAC, rate limiting, helmet, CORS, audit trail, GDPR-aligned data handling |
| **Regions** | Names, formats and legal notes configurable per tenant (EEA / US / APAC / MENA) |

## 2. Identity & Access

- Authentication: login, logout, refresh tokens, change/forgot/reset password, email verification
- User/employee profiles (name, locale, timezone, avatar, job title, manager, department, team, start date)
- Roles & permissions (RBAC): `super_admin`, `org_admin`, `hr_manager`, `manager`, `employee` (+ custom roles)
- Fine-grained permission catalog per domain (e.g. `users:create`, `reviews:finalize`)
- Employee lifecycle: active / inactive / terminated; manager hierarchy
- CSV import/export of employees

## 3. Organization Structure

- Organizations and multi-tenant settings
- Department tree (nested), team management, team membership
- Default taxonomies & per-tenant configuration (rating scales, review statuses, recognition points)

## 4. Goal Management (OKR / SMART)

- Company → department → team → individual goal **cascading / alignment** (parent-child)
- Goal properties: title, description, type (`company/team/personal`), start/end dates, priority, status, progress
- Key Results per goal (OKR model) with target/value and progress auto-calculation
- Check-ins (progress updates, notes/blockers)
- Goal history and ownership

## 5. KPI Management

- KPI definitions (name, unit, target, weight, owner = department/team/user, period)
- KPI entries / actuals collected over time
- Progress vs target, weighted scoring, KPI dashboards

## 6. Performance Reviews & Appraisals

- **Review cycles** (quarterly / semi-annual / annual), open/closed lifecycle
- **Review templates**: sections + rating questions + open questions, configurable rating scales (e.g. 1–5 with labels)
- **Performance reviews** per employee per cycle with workflow:
  `draft → self-assessment → peer/manager review → consolidated rating → approval → sign-off`
- **360° feedback**: participants by role (self, manager, peers, subordinates, customers), anonymous option
- Rating aggregation, weighted scores, performance summary (e.g. Outstanding → Needs Improvement)
- Review history per employee (career timeline)

## 7. Continuous Feedback

- Give / request real-time feedback (praise / constructive)
- Visibility: public (feed) or private (1:1)
- Feedback wall / mentions

## 8. Development Plans (IDP)

- Individual development plans with focus areas
- Development activities: training, mentoring, stretch assignments; status, due date, progress
- Link to competency gaps

## 9. Competencies & Skills

- Competency frameworks (per tenant): skills + proficiency levels (1–5)
- Skill assessments (self / manager), competency gap analysis

## 10. Recognitions

- Peer recognition with message, points/badges, feed visibility
- Per-tenant recognition points configuration

## 11. Notifications

- In-app notifications (read/unread), digests
- Email notifications (SMTP), opt-in prefs per channel
- Reminders for pending reviews / check-ins

## 12. Reports, Dashboards & Analytics

- Org performance heatmap / distribution
- Goal progress, KPI attainment, review score trends
- Export to CSV / PDF, printable summaries
- Prometheus metrics (`/metrics`), health checks, structured logs

## 13. Administration & Compliance

- Settings & taxonomies management
- Audit log (who did what, when, from where)
- Data retention / GDPR: export & anonymisation endpoints
- Observability: logging, monitoring, documentation (OpenAPI/Swagger)

---

## API Module Map (implemented in `api/`)

```
auth  organizations  users  roles  departments  teams
goals  kpis  review-cycles  review-templates  reviews  feedback
development-plans  competencies  recognitions  notifications
reports  admin  system(health,metrics)  notifications
```

### Cross-cutting concerns
- Unified response envelope `{ success, data, meta, message }`
- Zod request validation, central error handler, translation keys
- Pagination, filtering, sorting helpers
- Swagger/OpenAPI docs at `/docs`