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

## 14. One-on-Ones

- Recurring manager ↔ employee meeting series (cadence, start date, participants)
- Per-meeting agendas co-owned by both participants
- Action items with owner, due date and completion state
- Meeting notes and private/shared visibility
- Upcoming-meeting reminders and history

## 15. Engagement Surveys

- Survey lifecycle: draft → scheduled → active → closed
- Question types: rating, single choice, multi choice, text, eNPS
- Anonymous responses with minimum-response thresholds for analytics
- Participation tracking, response rates, per-question distribution and eNPS
- Scheduled launch/close windows and one-response-per-participant enforcement

## 16. Time Off & Leave

- Leave types with accrual, carry-over and approval policy per tenant
- Per-employee balances (accrued / used / available) by leave year
- Leave requests with working-day calculation, holiday calendars and approval workflow
- Manager/HR approval, rejection reasons and cancellation
- Public holidays per location and team absence calendar

## 17. Compensation

- Salary bands per job level, location and currency (min / midpoint / max)
- Compensation records: base pay, variable pay, currency, effective date, reason
- Pay review cycles with budget, eligibility and approval workflow
- Per-employee review decisions (proposed → approved / rejected), immutable once locked
- Compensation history and band-position analytics

## 18. Onboarding & Offboarding

- Reusable onboarding/offboarding templates with ordered tasks
- Task assignment to employee, manager, buddy or HR; relative due dates
- Assignment lifecycle with progress tracking and completion percentage
- Automatic task generation when an assignment starts

## 19. Calibration & 9-Box

- Calibration sessions scoped to a review cycle or period
- Participant pool with performance and potential ratings
- 9-box placement (`low_impact` … `star`) derived from performance × potential bands
- Final ratings captured during calibration and locked on completion
- Session completion rules and immutable final ratings

## 20. Documents & Acknowledgements

- Document templates (policies, contracts, handbooks) with versioning
- Send to selected recipients (user, department, team, organization)
- Expiry windows and e-acknowledgement timestamps
- Acknowledged / pending / expired status per recipient
- Audit-friendly delivery and acknowledgement trail

## 21. Integrations & Webhooks

- Tenant-scoped API keys with hashed secrets, scopes and revocation
- Webhook subscriptions with event filters and HMAC signing secret
- Delivery history with status codes, retries and payload snapshots
- Event dispatch for surveys, time off, documents and review lifecycle
- Background delivery through the BullMQ queue when Redis is configured

---

## API Module Map (implemented in `api/`)

```
auth  organizations  users  roles  departments  teams
goals  kpis  review-cycles  review-templates  reviews  feedback
development-plans  competencies  recognitions  notifications
one-on-ones  surveys  time-off  compensation  onboarding
calibration  documents  integrations
reports  admin  system(health,metrics)
```

### Cross-cutting concerns
- Unified response envelope `{ success, data, meta, message }`
- Zod request validation, central error handler, translation keys
- Pagination, filtering, sorting helpers (`X-Total-Count` on list endpoints)
- Swagger/OpenAPI docs at `/docs`, GraphQL read API at `/graphql`
- Background jobs (BullMQ/Redis with inline fallback) for email, notifications and webhooks
- Prometheus metrics at `/metrics`, health at `/health`, structured logs