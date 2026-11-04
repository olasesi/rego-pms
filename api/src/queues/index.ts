import { Queue, Worker, type Job } from 'bullmq';
import { config } from '../config/env';
import { getRedis } from '../config/redis';
import { log } from '../config/logger';

export const QUEUE_NAME = 'pms-jobs';

export interface JobPayloads {
  'email.send': { to: string | string[]; subject: string; text?: string; html?: string };
  'notification.send': {
    userId: number;
    orgId?: number | null;
    type: string;
    title: string;
    body?: string | null;
    link?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  'webhook.dispatch': { orgId: number | null; event: string; data: Record<string, unknown> };
}

export type JobName = keyof JobPayloads;

type Handler<K extends JobName> = (payload: JobPayloads[K]) => Promise<void>;

const handlers: { [K in JobName]: Handler<K> } = {
  'email.send': async (payload) => {
    const { sendEmail } = await import('../common/services/email');
    await sendEmail(payload);
  },
  'notification.send': async (payload) => {
    const { notifyUser } = await import('../common/services/notification');
    await notifyUser(payload);
  },
  'webhook.dispatch': async (payload) => {
    const { dispatchWebhookEvent } = await import('../modules/integrations/integrations.service');
    await dispatchWebhookEvent(payload.orgId, payload.event, payload.data);
  },
};

let queue: Queue | null = null;
let worker: Worker | null = null;

const redisEnabled = (): boolean => Boolean(config.REDIS_URL) && !config.isTest;

function getQueue(): Queue | null {
  if (!redisEnabled()) return null;
  const connection = getRedis();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });
  }
  return queue;
}

/**
 * Enqueue a background job. When Redis is not configured (local development,
 * tests, or single-node deployments) the job runs inline so behaviour is
 * unchanged for callers.
 */
export async function enqueue<K extends JobName>(name: K, payload: JobPayloads[K]): Promise<void> {
  const q = getQueue();
  if (!q) {
    try {
      await handlers[name](payload);
    } catch (err) {
      log.error(`[queue] inline job '${name}' failed`, { error: (err as Error).message });
    }
    return;
  }
  try {
    await q.add(name, payload);
  } catch (err) {
    log.warn(`[queue] failed to enqueue '${name}', running inline`, { error: (err as Error).message });
    await handlers[name](payload);
  }
}

/** Start the BullMQ worker (no-op when Redis is unavailable). */
export function startQueueWorker(): void {
  if (!redisEnabled() || worker) return;
  const connection = getRedis();
  if (!connection) return;
  worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const name = job.name as JobName;
      const handler = handlers[name];
      if (!handler) throw new Error(`Unknown job '${name}'`);
      await handler(job.data);
      log.debug(`[queue] completed '${name}' (${job.id})`);
    },
    { connection: connection.duplicate(), concurrency: Number(process.env.QUEUE_CONCURRENCY) || 5 },
  );
  worker.on('failed', (job, err) => {
    log.error(`[queue] job '${job?.name}' failed`, { id: job?.id, error: err.message });
  });
  worker.on('error', (err) => log.warn(`[queue] worker error`, { error: err.message }));
  log.info(`[queue] worker started (${QUEUE_NAME})`);
}

export async function stopQueue(): Promise<void> {
  if (worker) {
    await worker.close().catch(() => undefined);
    worker = null;
  }
  if (queue) {
    await queue.close().catch(() => undefined);
    queue = null;
  }
}

export default enqueue;
