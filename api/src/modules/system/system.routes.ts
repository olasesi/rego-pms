import { Router } from 'express';
import type { Request, Response } from 'express';
import os from 'os';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { sendOk } from '../../common/utils/responses';
import { sequelize } from '../../config/database';
import { metricsRegistry } from '../../common/middleware/metrics';
import { getRedis } from '../../config/redis';
import { log } from '../../config/logger';

const router = Router();

router.get('/info', authenticate, authorize('system:health'), asyncHandlerInfo);

async function asyncHandlerInfo(_req: Request, res: Response): Promise<Response> {
  const dbStatus = await checkDb().catch(() => 'down');
  let redisStatus = 'disabled';
  const redis = getRedis();
  if (redis) {
    try {
      await redis.ping();
      redisStatus = 'up';
    } catch {
      redisStatus = 'down';
    }
  }
  return sendOk(res, {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    node: process.version,
    platform: process.platform,
    versions: process.versions,
    db: dbStatus,
    redis: redisStatus,
    cpuCount: os.cpus().length,
  });
}

async function checkDb(): Promise<string> {
  try {
    await sequelize.authenticate();
    return 'up';
  } catch (err) {
    log.warn('[system] DB check failed', { error: (err as Error).message });
    throw err;
  }
}

router.get('/metrics', async (_req: Request, res: Response): Promise<void> => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

export default router;