import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { asyncHandler, sendOk } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { reviewCycleService } from './reviewCycles.service';

const router = Router();

const createCycleSchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: z.string().max(2000).optional(),
  period: z.enum(['quarter', 'half_year', 'annual', 'custom']).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  settings: z.record(z.string(), z.any()).optional(),
});

const updateCycleSchema = createCycleSchema.partial().omit({ startDate: true, endDate: true });

registerCrudRoutes(router, reviewCycleService, {
  readPermission: 'cycles:read',
  writePermission: 'cycles:manage',
  createSchema: createCycleSchema,
  updateSchema: updateCycleSchema,
});

router.post('/:id/activate', authenticate, authorize('cycles:manage'), asyncHandler(async (req, res) => {
  const cycle = await reviewCycleService.changeStatus(parseId(req.params.id), 'active', req);
  return sendOk(res, cycle);
}));

router.post('/:id/close', authenticate, authorize('cycles:manage'), asyncHandler(async (req, res) => {
  const cycle = await reviewCycleService.close(parseId(req.params.id), req);
  return sendOk(res, cycle);
}));

export default router;