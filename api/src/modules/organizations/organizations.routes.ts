import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { organizationService } from './organizations.service';

const router = Router();

const createOrgSchema = z.object({
  name: z.string().trim().min(1).max(140),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9-]+$/).optional(),
  legalName: z.string().max(255).optional(),
  country: z.string().length(2).optional(),
  timezone: z.string().max(60).optional(),
  locale: z.string().max(10).optional(),
  currency: z.string().length(3).optional(),
});

const updateOrgSchema = createOrgSchema.partial().omit({ slug: true });

const settingsSchema = z.object({
  settings: z.record(z.string(), z.any()),
});

registerCrudRoutes(router, organizationService, {
  readPermission: 'organizations:read',
  writePermission: 'organizations:update',
  createSchema: createOrgSchema,
  updateSchema: updateOrgSchema,
});

router.get('/:id/settings', authenticate, authorize('organizations:read'), asyncHandler(async (req, res) => {
  const settings = await organizationService.getSettings(parseId(req.params.id));
  return sendOk(res, settings);
}));

router.put('/:id/settings', authenticate, authorize('admin:settings'), validate(settingsSchema), asyncHandler(async (req, res) => {
  const settings = await organizationService.setSettings(parseId(req.params.id), req.body.settings, req.user!.id);
  return sendOk(res, settings);
}));

router.get('/:id/stats', authenticate, authorize('organizations:read'), asyncHandler(async (req, res) => {
  const stats = await organizationService.stats(parseId(req.params.id));
  return sendOk(res, stats);
}));

export default router;