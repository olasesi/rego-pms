import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { developmentPlanService } from './developmentPlans.service';

const router = Router();

const createPlanSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().trim().min(1).max(180),
  description: z.string().max(2000).optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  focusAreas: z.record(z.string(), z.any()).optional(),
});

const updatePlanSchema = createPlanSchema.partial().omit({ userId: true });

const createActivitySchema = z.object({
  type: z.enum(['training', 'course', 'mentoring', 'project', 'certification', 'other']).optional(),
  title: z.string().trim().min(1).max(180),
  description: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
  link: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
});

const updateActivitySchema = z.object({
  type: z.enum(['training', 'course', 'mentoring', 'project', 'certification', 'other']).optional(),
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().nullable().optional(),
  link: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

router.get('/mine', authenticate, authorize('plans:read'), asyncHandler(async (req, res) => {
  const plans = await developmentPlanService.listByUser(req.user!.id, req.query.status as string | undefined);
  return sendOk(res, plans);
}));

registerCrudRoutes(router, developmentPlanService, {
  readPermission: 'plans:read',
  writePermission: 'plans:manage',
  createSchema: createPlanSchema,
  updateSchema: updatePlanSchema,
});

router.post('/:id/activities', authenticate, authorize('plans:manage'), validate(createActivitySchema), asyncHandler(async (req, res) => {
  const activity = await developmentPlanService.addActivity(parseId(req.params.id), req.body, req);
  return sendCreated(res, activity);
}));

router.patch('/:id/activities/:activityId', authenticate, authorize('plans:manage'), validate(updateActivitySchema), asyncHandler(async (req, res) => {
  const activity = await developmentPlanService.updateActivity(parseId(req.params.id), parseId(req.params.activityId), req.body, req);
  return sendOk(res, activity);
}));

router.delete('/:id/activities/:activityId', authenticate, authorize('plans:manage'), asyncHandler(async (req, res) => {
  await developmentPlanService.removeActivity(parseId(req.params.id), parseId(req.params.activityId), req);
  return sendEmpty(res);
}));

export default router;