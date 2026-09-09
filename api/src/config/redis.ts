import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';
import { logger } from './logger';

let client: Redis | null = null;

function buildRedis(): Redis | null {
  if (!config.REDIS_URL) return null;
  const options: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => Math.min(times * 200, 2000),
  };
  const redis = new Redis(config.REDIS_URL, options);
  redis.on('error', (err: Error) => logger.warn(`[redis] ${err.message}`));
  redis.on('connect', () => logger.info('[redis] connected'));
  return redis;
}

export function getRedis(): Redis | null {
  if (!config.REDIS_URL) return null;
  if (!client) client = buildRedis();
  return client;
}

export async function disposeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}

export default getRedis;