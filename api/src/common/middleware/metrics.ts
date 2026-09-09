import type { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({ register: metricsRegistry, prefix: 'pms_' });

const httpRequestsTotal = new client.Counter({
  name: 'pms_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [metricsRegistry],
});

const httpRequestDuration = new client.Histogram({
  name: 'pms_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

const dbQueryDuration = new client.Histogram({
  name: 'pms_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [metricsRegistry],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const routePath = (req.route?.path ?? req.path) || req.path;
    const normalized = `${req.baseUrl || ''}${routePath}`;
    const labels = { method: req.method, path: normalized, status: String(res.statusCode) };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
};

export const metricsEndpoint = async (_req: Request, res: Response): Promise<void> => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
};

export { dbQueryDuration };
export default metricsRegistry;