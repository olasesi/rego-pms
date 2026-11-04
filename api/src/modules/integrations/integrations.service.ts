import crypto from 'crypto';
import type { Request } from 'express';
import { Op } from 'sequelize';
import { ApiKey, Webhook, WebhookDelivery } from '../../models';
import { CrudService } from '../../common/services/crud';
import { config } from '../../config/env';
import { log } from '../../config/logger';
import { ApiError } from '../../common/utils/ApiError';
import { actorId, tenantScope } from '../../common/utils/access';
import { randomCode } from '../../common/utils/helpers';
import { enqueue } from '../../queues';

const KEY_PREFIX = 'pms_';

const hashSecret = (secret: string): string => crypto.createHash('sha256').update(secret).digest('hex');

const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
};

export class ApiKeyService {
  async list(req: Request): Promise<any[]> {
    return ApiKey.findAll({
      where: tenantScope(req),
      attributes: ['id', 'name', 'keyPrefix', 'scopes', 'lastUsedAt', 'expiresAt', 'revokedAt', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
  }

  async create(body: Record<string, unknown>, req: Request): Promise<Record<string, unknown>> {
    const orgId = req.tenantId;
    if (orgId == null) throw new ApiError(400, 'common.invalidRequest');
    const secret = `${KEY_PREFIX}${randomCode(40, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}`;
    const key = await ApiKey.create({
      orgId,
      name: String(body.name),
      keyPrefix: secret.slice(0, 12),
      keyHash: hashSecret(secret),
      scopes: Array.isArray(body.scopes) ? (body.scopes as string[]) : null,
      expiresAt: body.expiresAt != null ? new Date(String(body.expiresAt)) : null,
      createdById: actorId(req),
    });
    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      expiresAt: key.expiresAt,
      secret,
    };
  }

  async revoke(id: number, req: Request): Promise<any> {
    const key = await ApiKey.findOne({ where: { id, ...tenantScope(req) } });
    if (!key) throw new ApiError(404, 'integrations.apiKeyNotFound');
    await key.update({ revokedAt: new Date() });
    return { id: key.id, revokedAt: key.revokedAt };
  }

  async remove(id: number, req: Request): Promise<void> {
    const key = await ApiKey.findOne({ where: { id, ...tenantScope(req) } });
    if (!key) throw new ApiError(404, 'integrations.apiKeyNotFound');
    await key.destroy();
  }
}

export class WebhookService extends CrudService {
  constructor() {
    super({
      model: Webhook,
      moduleKey: 'webhook',
      tenantScoped: true,
      searchFields: ['name', 'url', 'description'],
      filters: [{ field: 'isActive', type: 'boolean' }],
      defaultSortBy: 'createdAt',
      notFoundKey: 'integrations.webhookNotFound',
      beforeCreate: (data) => ({
        ...data,
        secret: (data.secret as string | undefined) ?? `${KEY_PREFIX}whsec_${randomCode(32, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}`,
      }),
      validateCreate: (data) => {
        const url = String(data.url ?? '');
        if (!/^https?:\/\//i.test(url)) throw new ApiError(400, 'integrations.invalidWebhookUrl');
        const events = data.events;
        if (!Array.isArray(events) || events.length === 0) throw new ApiError(400, 'integrations.noEvents');
      },
    });
  }

  private async load(id: number, req: Request): Promise<any> {
    return this.findById(id, req);
  }

  async deliveries(id: number, req: Request): Promise<any[]> {
    await this.load(id, req);
    return WebhookDelivery.findAll({
      where: { webhookId: id },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
  }

  async test(id: number, req: Request): Promise<any> {
    const webhook = await this.load(id, req);
    return dispatchToWebhook(webhook, 'webhook.test', {
      message: 'This is a test delivery from Rego PMS',
      sentAt: new Date().toISOString(),
    });
  }
}

const signPayload = (secret: string, body: string): string =>
  `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;

async function dispatchToWebhook(webhook: Webhook, event: string, data: Record<string, unknown>): Promise<WebhookDelivery> {
  const payload = { event, data, timestamp: new Date().toISOString() };
  const body = JSON.stringify(payload);
  const delivery = await WebhookDelivery.create({
    webhookId: webhook.id,
    event,
    payload,
    status: 'pending',
    attempts: 0,
  });

  try {
    const url = new URL(webhook.url);
    if (config.isProduction && isPrivateHost(url.hostname)) {
      throw new Error('Refusing to deliver to a private network address');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'RegoPMS-Webhook/1.0',
        'x-pms-event': event,
        'x-pms-delivery': String(delivery.id),
        'x-pms-signature': signPayload(webhook.secret, body),
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    await delivery.update({
      status: response.ok ? 'success' : 'failed',
      statusCode: response.status,
      attempts: delivery.attempts + 1,
      error: response.ok ? null : `HTTP ${response.status}`,
      deliveredAt: response.ok ? new Date() : null,
    });
  } catch (err) {
    await delivery.update({
      status: 'failed',
      attempts: delivery.attempts + 1,
      error: (err as Error).message,
    });
  }
  return delivery;
}

/** Fan out a domain event to every active webhook subscribed to it. Never throws. */
export async function dispatchWebhookEvent(
  orgId: number | null,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (orgId == null) return;
  try {
    const webhooks = await Webhook.findAll({ where: { orgId, isActive: true } });
    const matching = webhooks.filter((webhook) => {
      const events = Array.isArray(webhook.events) ? webhook.events : [];
      return events.includes(event) || events.includes('*');
    });
    await Promise.allSettled(matching.map((webhook) => dispatchToWebhook(webhook, event, data)));
  } catch (err) {
    log.warn(`[webhooks] dispatch failed for ${event}`, { error: (err as Error).message });
  }
}

/** Best-effort fire-and-forget dispatch used by request handlers. */
export const queueWebhookEvent = (orgId: number | null, event: string, data: Record<string, unknown>): void => {
  void enqueue('webhook.dispatch', { orgId, event, data });
};

export class WebhookDeliveryService {
  async list(req: Request): Promise<any[]> {
    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = req.query.status;
    const hooks = await Webhook.findAll({ where: tenantScope(req), attributes: ['id'] });
    const ids = hooks.map((h) => h.id);
    if (req.query.webhookId) {
      const webhookId = Number(req.query.webhookId);
      if (!ids.includes(webhookId)) return [];
      where.webhookId = webhookId;
    } else {
      where.webhookId = { [Op.in]: ids };
    }
    return WebhookDelivery.findAll({ where, order: [['createdAt', 'DESC']], limit: 200 });
  }
}

export const apiKeyService = new ApiKeyService();
export const webhookService = new WebhookService();
export const webhookDeliveryService = new WebhookDeliveryService();
