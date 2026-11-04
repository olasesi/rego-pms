import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import {
  compensationBandService,
  compensationRecordService,
  payReviewService,
} from './compensation.service';

const router = Router();

const bandSchema = z.object({
  name: z.string().trim().min(1).max(140),
  level: z.string().max(60).nullable().optional(),
  minSalary: z.number().min(0),
  midSalary: z.number().min(0),
  maxSalary: z.number().min(0),
  currency: z.string().length(3).optional(),
  country: z.string().length(2).nullable().optional(),
});

const recordSchema = z.object({
  userId: z.number().int().positive(),
  type: z.enum(['salary', 'bonus', 'equity', 'allowance', 'commission']).optional(),
  amount: z.number().min(0),
  currency: z.string().length(3).optional(),
  frequency: z.enum(['annual', 'monthly', 'one_time']).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note: z.string().max(3000).nullable().optional(),
  approvedById: z.number().int().positive().nullable().optional(),
});

const cycleSchema = z.object({
  name: z.string().trim().min(1).max(180),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  totalBudget: z.number().min(0).nullable().optional(),
  currency: z.string().length(3).optional(),
});

const decisionSchema = z.object({
  userId: z.number().int().positive(),
  currentAmount: z.number().min(0),
  proposedAmount: z.number().min(0),
  currency: z.string().length(3).optional(),
  note: z.string().max(3000).nullable().optional(),
});

const updateDecisionSchema = decisionSchema.partial().omit({ userId: true }).extend({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

router.get(
  '/records/mine',
  authenticate,
  authorize('compensation:read'),
  asyncHandler(async (req, res) => sendOk(res, await compensationRecordService.mine(req))),
);

router.get(
  '/summary/:userId',
  authenticate,
  authorize('compensation:read'),
  asyncHandler(async (req, res) => sendOk(res, await compensationRecordService.summary(parseId(req.params.userId), req))),
);

router.get(
  '/my-decisions',
  authenticate,
  authorize('compensation:read'),
  asyncHandler(async (req, res) => sendOk(res, await payReviewService.myDecisions(req))),
);

router.get(
  '/pay-reviews/:id/decisions',
  authenticate,
  authorize('compensation:approve'),
  asyncHandler(async (req, res) => sendOk(res, await payReviewService.decisionSummary(parseId(req.params.id), req))),
);

router.post(
  '/pay-reviews/:id/decisions',
  authenticate,
  authorize('compensation:approve'),
  validate(decisionSchema),
  asyncHandler(async (req, res) => sendCreated(res, await payReviewService.addDecision(parseId(req.params.id), req.body, req))),
);

router.patch(
  '/pay-reviews/:id/decisions/:decisionId',
  authenticate,
  authorize('compensation:approve'),
  validate(updateDecisionSchema),
  asyncHandler(async (req, res) =>
    sendOk(res, await payReviewService.updateDecision(parseId(req.params.id), parseId(req.params.decisionId), req.body, req)),
  ),
);

router.post(
  '/pay-reviews/:id/decisions/:decisionId/approve',
  authenticate,
  authorize('compensation:approve'),
  asyncHandler(async (req, res) =>
    sendOk(res, await payReviewService.approveDecision(parseId(req.params.id), parseId(req.params.decisionId), req)),
  ),
);

router.post(
  '/pay-reviews/:id/close',
  authenticate,
  authorize('compensation:approve'),
  asyncHandler(async (req, res) => sendOk(res, await payReviewService.close(parseId(req.params.id), req))),
);

router.use(
  '/bands',
  registerCrudRoutes(Router(), compensationBandService, {
    readPermission: 'compensation:read',
    writePermission: 'compensation:manage',
    createSchema: bandSchema,
    updateSchema: bandSchema.partial(),
  }),
);

router.use(
  '/records',
  registerCrudRoutes(Router(), compensationRecordService, {
    readPermission: 'compensation:read',
    writePermission: 'compensation:manage',
    createSchema: recordSchema,
    updateSchema: recordSchema.partial().omit({ userId: true }),
  }),
);

router.use(
  '/pay-reviews',
  registerCrudRoutes(Router(), payReviewService, {
    readPermission: 'compensation:approve',
    writePermission: 'compensation:approve',
    createSchema: cycleSchema,
    updateSchema: cycleSchema.partial(),
  }),
);

export default router;
