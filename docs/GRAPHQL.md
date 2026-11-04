# GraphQL API

The PMS exposes a **read-only GraphQL endpoint** alongside the REST API for
dashboards and mobile clients that need to fetch related data in one round trip.

- Endpoint: `POST /graphql`
- Authentication: `Authorization: Bearer <access token>` (same JWT as REST)
- Tenant: derived from the token, or overridden with `x-tenant-id`
- Format: standard GraphQL over HTTP (`application/json`)
- Introspection: enabled; GraphiQL is not served in production

The endpoint is mounted before the JSON body parser because `graphql-http`
consumes the raw request stream.

---

## Example

```bash
curl -s http://localhost:8000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query Dashboard { me { id firstName lastName } goals(status: \"on_track\", limit: 5) { id title progress owner { firstName lastName } } surveys { id title status questions { id title type } } }"
  }'
```

Variables are supported as usual:

```json
{
  "query": "query Goals($status: String, $limit: Int) { goals(status: $status, limit: $limit) { id title progress } }",
  "variables": { "status": "on_track", "limit": 10 }
}
```

---

## Schema

### Queries

| Query | Arguments | Returns | Access |
|-------|-----------|---------|--------|
| `me` | — | `User` | Authenticated user |
| `users` | `limit`, `search` | `[User!]!` | Authenticated user (directory) |
| `goals` | `status`, `limit` | `[Goal!]!` | Tenant-scoped |
| `reviews` | `limit` | `[Review!]!` | Own reviews unless `reviews:read` / admin |
| `feedbackReceived` | `limit` | `[Feedback!]!` | Current user only |
| `recognitionsReceived` | `limit` | `[Recognition!]!` | Current user only |
| `surveys` | — | `[Survey!]!` | Tenant-scoped |
| `oneOnOneSeries` | — | `[OneOnOneSeries!]!` | Participant unless `one_on_ones:manage` / admin |
| `leaveRequests` | `status` | `[LeaveRequest!]!` | Own unless `time_off:approve` / admin |
| `documents` | — | `[EmployeeDocument!]!` | Own unless `documents:manage` |

### Types

- `User` — id, name, email, title, locale, timezone, department, manager
- `Goal` — title, description, status, priority, alignment, progress, dates, owner
- `Review` — status, overall rating, completion, cycle, reviewee
- `Feedback` — type, title, message, visibility, sender, createdAt
- `Recognition` — message, points, badge, sender, createdAt
- `Survey` / `SurveyQuestion` — lifecycle, anonymity, dates, ordered questions
- `OneOnOneSeries` / `Meeting` — cadence, status, participants, recent meetings
- `LeaveRequest` — dates, working days, status, reason
- `EmployeeDocument` / `DocumentTemplate` — status, acknowledgement, expiry, template

All queries cap results (default 25, maximum 100) to protect the database.

---

## When to use GraphQL vs REST

| Use GraphQL | Use REST |
|-------------|----------|
| Dashboard aggregation across modules | CRUD mutations |
| Mobile clients with limited bandwidth | File/CSV/PDF downloads |
| Rapidly evolving read shapes | Endpoints documented in Swagger |
| Fetching nested relations in one call | Webhooks and integrations |

Mutations stay in REST so validation, permissions, audit logging and i18n error
codes remain consistent across every write path.

---

## Errors

GraphQL returns the standard `errors` array. Authentication failures happen at
the middleware layer and return the REST error envelope with HTTP 401 before the
GraphQL handler runs.

```json
{
  "errors": [{ "message": "Cannot query field \"nope\" on type \"Query\".", "locations": [] }]
}
```

Permission checks inside resolvers return `null` or an empty list rather than
leaking the existence of other tenants' records.
