import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import {
  onboardingService,
  onboardingTemplateService,
} from './onboarding.service';

const router = Router();

const templateSchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: z.string().max(5000).nullable().optional(),
  type: z.enum(['onboarding', 'offboarding']).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

const templateTaskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  category: z.enum(['paperwork', 'it', 'training', 'introduction', 'compliance', 'other']).optional(),
  assigneeRole: z.enum(['employee', 'manager', 'hr', 'it']).optional(),
  dueOffsetDays: z.number().int().min(-365).max(365).optional(),
  sortOrder: z.number().int().optional(),
});

const assignSchema = z.object({
  userId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const progressSchema = z.object({
  status: z.enum(['pending', 'completed', 'skipped']),
  note: z.string().max(2000).nullable().optional(),
});

// Assignments: static routes before the generic CRUD registration.
router.get(
  '/assignments/mine',
  authenticate,
  authorize('onboarding:read'),
  asyncHandler(async (req, res) => sendOk(res, await onboardingService.mine(req))),
);

router.get(
  '/assignments',
  authenticate,
  authorize('onboarding:read'),
  asyncHandler(async (req, res) => sendOk(res, await onboardingService.list(req))),
);

router.get(
  '/assignments/:id',
  authenticate,
  authorize('onboarding:read'),
  asyncHandler(async (req, res) => sendOk(res, await onboardingService.findById(parseId(req.params.id), req))),
);

router.patch(
  '/assignments/:id/tasks/:taskId',
  authenticate,
  authorize('onboarding:read'),
  validate(progressSchema),
  asyncHandler(async (req, res) =>
    sendOk(res, await onboardingService.updateTaskProgress(parseId(req.params.id), parseId(req.params.taskId), req.body, req)),
  ),
);

router.post(
  '/assignments/:id/cancel',
  authenticate,
  authorize('onboarding:manage'),
  asyncHandler(async (req, res) => sendOk(res, await onboardingService.cancel(parseId(req.params.id), req))),
);

router.post(
  '/templates/:id/assign',
  authenticate,
  authorize('onboarding:manage'),
  validate(assignSchema),
  asyncHandler(async (req, res) =>
    sendCreated(res, await onboardingService.assign(parseId(req.params.id), req.body, onboardingTemplateService, req)),
  ),
);

router.post(
  '/templates/:id/tasks',
  authenticate,
  authorize('onboarding:manage'),
  validate(templateTaskSchema),
  asyncHandler(async (req, res) => sendCreated(res, await onboardingTemplateService.addTask(parseId(req.params.id), req.body, req))),
);

router.patch(
  '/templates/:id/tasks/:taskId',
  authenticate,
  authorize('onboarding:manage'),
  validate(templateTaskSchema.partial()),
  asyncHandler(async (req, res) =>
    sendOk(res, await onboardingTemplateService.updateTask(parseId(req.params.id), parseId(req.params.taskId), req.body, req)),
  ),
);

router.delete(
  '/templates/:id/tasks/:taskId',
  authenticate,
  authorize('onboarding:manage'),
  asyncHandler(async (req, res) => {
    await onboardingTemplateService.removeTask(parseId(req.params.id), parseId(req.params.taskId), req);
    return sendEmpty(res);
  }),
);

router.use(
  '/templates',
  registerCrudRoutes(Router(), onboardingTemplateService, {
    readPermission: 'onboarding:read',
    writePermission: 'onboarding:manage',
    createSchema: templateSchema,
    updateSchema: templateSchema.partial(),
  }),
);

export default router;
