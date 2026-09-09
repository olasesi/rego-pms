import type { NextFunction, Request, Response } from 'express';
import { AuditLog } from '../../models';
import { log } from '../../config/logger';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'currentPassword', 'newPassword', 'refreshToken', 'token']);

const sanitizeBody = (body: unknown): unknown => {
  if (Array.isArray(body)) return body.map(sanitizeBody);
  if (body && typeof body === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      out[key] = typeof value === 'object' && value !== null ? sanitizeBody(value) : value;
    }
    return out;
  }
  return body;
};

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }
  res.on('finish', () => {
    const entity = (req.baseUrl + req.path).split('/').filter(Boolean).slice(-2)[0] ?? 'unknown';
    const payload = {
      orgId: req.tenantId ?? null,
      userId: req.user?.id ?? null,
      action: `${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`,
      entity,
      entityId: Number(req.params?.id) || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      requestId: req.requestId ?? null,
      body: (sanitizeBody(req.body) as Record<string, unknown> | null) ?? null,
    };
    void AuditLog.create(payload as any).catch((err: Error) =>
      log.warn('[audit] failed to persist audit entry', { error: err.message }),
    );
  });
  next();
}

export default auditMiddleware;