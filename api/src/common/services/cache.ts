import NodeCache from 'node-cache';
import { getRedis } from '../../config/redis';
import { log } from '../../config/logger';

interface CacheBackend {
  get<T>(key: string): Promise<T | null | undefined>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
}

class LocalCacheBackend implements CacheBackend {
  private readonly store = new NodeCache({ stdTTL: 300, checkperiod: 120 });

  async get<T>(key: string): Promise<T | null | undefined> {
    return this.store.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    this.store.del(key);
  }

  async flush(): Promise<void> {
    this.store.flushAll();
  }
}

class RedisCacheBackend implements CacheBackend {
  private redis = getRedis();

  async get<T>(key: string): Promise<T | null | undefined> {
    const redis = this.redis;
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const redis = this.redis;
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      log.warn('[cache] redis set failed', { error: (err as Error).message });
    }
  }

  async del(key: string): Promise<void> {
    const redis = this.redis;
    if (!redis) return;
    try {
      await redis.del(key);
    } catch {
      /* noop */
    }
  }

  async flush(): Promise<void> {
    throw new Error('Redis cache flush not supported via this helper');
  }
}

class CacheService {
  private readonly backend: CacheBackend;

  constructor() {
    this.backend = getRedis() ? new RedisCacheBackend() : new LocalCacheBackend();
  }

  async get<T>(key: string): Promise<T | null> {
    return (await this.backend.get<T>(key)) ?? null;
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    await this.backend.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.backend.del(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (this.backend instanceof LocalCacheBackend) {
      const keys = (this.backend as unknown as { store: NodeCache }).store.keys();
      const matches = keys.filter((k) => k.startsWith(prefix));
      matches.forEach((k) => void this.backend.del(k));
    }
  }

  async wrap<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

export const cache = new CacheService();
export default cache;