import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { kpiService } from './kpis.service';

const router = Router();

const createKpiSchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: z.string().max(2000).optional(),
  unit: z.string().max(40).optional(),
  ownerType: z.enum(['user', 'department', 'team', 'organization']),
  ownerId: z.number().int().positive(),
  targetValue: z.number(),
  baseValue: z.number().optional(),
  weight: z.number().positive().optional(),
  periodUnit: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const updateKpiSchema = createKpiSchema.partial().omit({ ownerId: true });

const createEntrySchema = z.object({
  value: z.number(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  note: z.string().max(1000).optional(),
});

const updateEntrySchema = createEntrySchema.partial();

registerCrudRoutes(router, kpiService, {
  readPermission: 'kpis:read',
  writePermission: 'kpis:manage',
  createSchema: createKpiSchema,
  updateSchema: updateKpiSchema,
});

router.get('/:id/entries', authenticate, authorize('kpis:read'), asyncHandler(async (req, res) => {
  const entries = await kpiService.listEntries(parseId(req.params.id), req);
  return sendOk(res, entries);
}));

router.post('/:id/entries', authenticate, authorize('kpis:manage'), validate(createEntrySchema), asyncHandler(async (req, res) => {
  const entry = await kpiService.addEntry(parseId(req.params.id), req.body, req);
  return sendCreated(res, entry);
}));

router.patch('/:id/entries/:entryId', authenticate, authorize('kpis:manage'), validate(updateEntrySchema), asyncHandler(async (req, res) => {
  const entry = await kpiService.updateEntry(parseId(req.params.id), parseId(req.params.entryId), req.body, req);
  return sendOk(res, entry);
}));

router.delete('/:id/entries/:entryId', authenticate, authorize('kpis:manage'), asyncHandler(async (req, res) => {
  await kpiService.removeEntry(parseId(req.params.id), parseId(req.params.entryId), req);
  return sendEmpty(res);
}));

export default router;