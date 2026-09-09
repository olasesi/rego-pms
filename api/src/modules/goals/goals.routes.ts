import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { goalService } from './goals.service';

const router = Router();

const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().max(3000).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  ownerId: z.number().int().positive().nullable().optional(),
  alignmentType: z.enum(['company', 'department', 'team', 'personal']).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const updateGoalSchema = createGoalSchema.partial().omit({ ownerId: true });

const createKeyResultSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().max(1000).optional(),
  initialValue: z.number().optional(),
  currentValue: z.number().optional(),
  targetValue: z.number(),
  unit: z.string().max(40).optional(),
  weight: z.number().positive().optional(),
  sortOrder: z.number().int().optional(),
});

const updateKeyResultSchema = createKeyResultSchema.partial();

const checkInSchema = z.object({
  progress: z.number().min(0).max(100).optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  note: z.string().max(3000).optional(),
  blockers: z.string().max(2000).optional(),
});

registerCrudRoutes(router, goalService, {
  readPermission: 'goals:read',
  writePermission: 'goals:manage',
  createSchema: createGoalSchema,
  updateSchema: updateGoalSchema,
});

router.get('/:id/key-results', authenticate, authorize('goals:read'), asyncHandler(async (req, res) => {
  const goal = await goalService.findById(parseId(req.params.id), req);
  return sendOk(res, goal.keyResults ?? []);
}));

router.post('/:id/key-results', authenticate, authorize('goals:manage'), validate(createKeyResultSchema), asyncHandler(async (req, res) => {
  const kr = await goalService.createKeyResult(parseId(req.params.id), req.body, req);
  return sendCreated(res, kr);
}));

router.patch('/:id/key-results/:krId', authenticate, authorize('goals:manage'), validate(updateKeyResultSchema), asyncHandler(async (req, res) => {
  const kr = await goalService.updateKeyResult(parseId(req.params.id), parseId(req.params.krId), req.body, req);
  return sendOk(res, kr);
}));

router.delete('/:id/key-results/:krId', authenticate, authorize('goals:manage'), asyncHandler(async (req, res) => {
  await goalService.removeKeyResult(parseId(req.params.id), parseId(req.params.krId), req);
  return sendEmpty(res);
}));

router.post('/:id/check-ins', authenticate, authorize('goals:manage'), validate(checkInSchema), asyncHandler(async (req, res) => {
  const checkIn = await goalService.addCheckIn(parseId(req.params.id), req.body, req);
  return sendCreated(res, checkIn);
}));

export default router;