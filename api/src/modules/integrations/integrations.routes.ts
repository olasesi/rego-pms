import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import {
  apiKeyService,
  webhookDeliveryService,
  webhookService,
} from './integrations.service';

const router = Router();

const apiKeySchema = z.object({
  name: z.string().trim().min(1).max(140),
  scopes: z.array(z.string()).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

const webhookSchema = z.object({
  name: z.string().trim().min(1).max(140),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(8).max(128).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(255).nullable().optional(),
});

// API keys
router.get(
  '/api-keys',
  authenticate,
  authorize('integrations:read'),
  asyncHandler(async (req, res) => sendOk(res, await apiKeyService.list(req))),
);

router.post(
  '/api-keys',
  authenticate,
  authorize('integrations:manage'),
  validate(apiKeySchema),
  asyncHandler(async (req, res) => sendCreated(res, await apiKeyService.create(req.body, req))),
);

router.post(
  '/api-keys/:id/revoke',
  authenticate,
  authorize('integrations:manage'),
  asyncHandler(async (req, res) => sendOk(res, await apiKeyService.revoke(parseId(req.params.id), req))),
);

router.delete(
  '/api-keys/:id',
  authenticate,
  authorize('integrations:manage'),
  asyncHandler(async (req, res) => {
    await apiKeyService.remove(parseId(req.params.id), req);
    return sendEmpty(res);
  }),
);

// Webhooks (static routes before CRUD mounting)
router.get(
  '/webhooks/:id/deliveries',
  authenticate,
  authorize('integrations:read'),
  asyncHandler(async (req, res) => sendOk(res, await webhookService.deliveries(parseId(req.params.id), req))),
);

router.post(
  '/webhooks/:id/test',
  authenticate,
  authorize('integrations:manage'),
  asyncHandler(async (req, res) => sendOk(res, await webhookService.test(parseId(req.params.id), req))),
);

router.get(
  '/deliveries',
  authenticate,
  authorize('integrations:read'),
  asyncHandler(async (req, res) => sendOk(res, await webhookDeliveryService.list(req))),
);

router.use(
  '/webhooks',
  registerCrudRoutes(Router(), webhookService, {
    readPermission: 'integrations:read',
    writePermission: 'integrations:manage',
    createSchema: webhookSchema,
    updateSchema: webhookSchema.partial(),
  }),
);

export default router;
