# Background Jobs & Webhooks

The API ships a small BullMQ queue for work that should not block an HTTP
request: email delivery, in-app notifications and webhook dispatch.

- Queue name: `pms-jobs`
- Redis connection: `REDIS_URL` (e.g. `redis://redis:6379`)
- Worker concurrency: `QUEUE_CONCURRENCY` (default `5`)
- Retries: 3 attempts with exponential backoff (2s base)
- Retention: last 200 completed and 500 failed jobs

## Inline fallback

Redis is **optional**. When `REDIS_URL` is empty, the API is under test, or
Redis is temporarily unreachable, jobs execute inline in the request process.
Callers see identical behaviour; only latency and durability differ.

```
enqueue('webhook.dispatch', payload)
  ├─ Redis configured → add to pms-jobs → worker executes
  └─ otherwise        → execute handler immediately
```

This keeps local development, unit tests and single-node installs dependency
free while allowing horizontal scaling in production.

## Job catalogue

| Job | Payload | Handler |
|-----|---------|---------|
| `email.send` | `{ to, subject, text?, html? }` | SMTP via Nodemailer |
| `notification.send` | `{ userId, orgId?, type, title, body?, link?, metadata? }` | In-app notification |
| `webhook.dispatch` | `{ orgId, event, data }` | Signed webhook delivery |

Add a job by extending `JobPayloads` and `handlers` in
`api/src/queues/index.ts`; TypeScript enforces the payload shape at every call
site.

## Webhook events

Webhooks are tenant-scoped and configured through `/api/v1/integrations/webhooks`.
The following events are dispatched today:

| Event | Emitted when |
|-------|--------------|
| `survey.submitted` | A participant submits a survey response |
| `leave.approved` | A leave request is approved |
| `document.sent` | A document is sent to recipients |
| `document.acknowledged` | A recipient acknowledges a document |

Deliveries include an HMAC-SHA256 signature header computed from the
subscription secret so consumers can verify authenticity. Delivery attempts and
response codes are recorded in the webhook delivery history.

## Operating the worker

The worker starts with the API process (`startQueueWorker()` in
`api/src/server.ts`) and shuts down gracefully with `SIGTERM`/`SIGINT` via
`stopQueue()`. In Kubernetes, every API replica participates in the queue; scale
the deployment to increase throughput.

Useful commands:

```bash
# Inspect queue depth (with redis-cli)
redis-cli LLEN bull:pms-jobs:wait
redis-cli ZCARD bull:pms-jobs:delayed

# Tail worker logs
docker compose logs -f api | grep '\[queue\]'
```

## Failure handling

- A failed job is retried up to three times, then retained under `failed`.
- A failure to enqueue (Redis down) falls back to inline execution and logs a
  warning instead of dropping the job.
- Email without SMTP configuration logs a warning and returns `false`; it never
  throws into the request path.
