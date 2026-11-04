import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { holidayService, leaveTypeService, timeOffService } from './timeOff.service';

const router = Router();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be an ISO date (YYYY-MM-DD)');

const leaveTypeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(40),
  description: z.string().max(2000).nullable().optional(),
  isPaid: z.boolean().optional(),
  accrual: z.enum(['annual', 'monthly', 'none']).optional(),
  defaultDays: z.number().min(0).max(366).optional(),
  requiresApproval: z.boolean().optional(),
  color: z.string().max(20).nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

const holidaySchema = z.object({
  name: z.string().trim().min(1).max(140),
  date: isoDate,
  isRecurring: z.boolean().optional(),
  region: z.string().max(80).nullable().optional(),
});

const submitRequestSchema = z.object({
  leaveTypeId: z.number().int().positive(),
  startDate: isoDate,
  endDate: isoDate,
  reason: z.string().max(3000).nullable().optional(),
});

const decisionSchema = z.object({
  note: z.string().max(2000).nullable().optional(),
});

const balanceSchema = z.object({
  userId: z.number().int().positive(),
  leaveTypeId: z.number().int().positive(),
  year: z.number().int().min(2000).max(2200).optional(),
  entitledDays: z.number().min(0).optional(),
  carriedOverDays: z.number().min(0).optional(),
  usedDays: z.number().min(0).optional(),
});

// Custom routes first.
router.get(
  '/balances/mine',
  authenticate,
  authorize('time_off:request'),
  asyncHandler(async (req, res) => sendOk(res, await timeOffService.myBalances(req))),
);

router.get(
  '/balances/:userId',
  authenticate,
  authorize('time_off:read'),
  asyncHandler(async (req, res) => sendOk(res, await timeOffService.balancesForUser(parseId(req.params.userId), req))),
);

router.post(
  '/balances',
  authenticate,
  authorize('time_off:manage'),
  validate(balanceSchema),
  asyncHandler(async (req, res) => sendCreated(res, await timeOffService.upsertBalance(req.body, req))),
);

router.get(
  '/requests/mine',
  authenticate,
  authorize('time_off:request'),
  asyncHandler(async (req, res) => sendOk(res, await timeOffService.myRequests(req))),
);

router.get(
  '/requests/pending',
  authenticate,
  authorize('time_off:approve'),
  asyncHandler(async (req, res) => sendOk(res, await timeOffService.pending(req))),
);

router.post(
  '/requests',
  authenticate,
  authorize('time_off:request'),
  validate(submitRequestSchema),
  asyncHandler(async (req, res) => sendCreated(res, await timeOffService.submit(req.body, req))),
);

router.patch(
  '/requests/:id/approve',
  authenticate,
  authorize('time_off:approve'),
  validate(decisionSchema),
  asyncHandler(async (req, res) => sendOk(res, await timeOffService.decide(parseId(req.params.id), 'approved', req.body.note ?? null, req))),
);

router.patch(
  '/requests/:id/reject',
  authenticate,
  authorize('time_off:approve'),
  validate(decisionSchema),
  asyncHandler(async (req, res) => sendOk(res, await timeOffService.decide(parseId(req.params.id), 'rejected', req.body.note ?? null, req))),
);

router.patch(
  '/requests/:id/cancel',
  authenticate,
  authorize('time_off:request'),
  asyncHandler(async (req, res) => sendOk(res, await timeOffService.cancel(parseId(req.params.id), req))),
);

router.get(
  '/calendar',
  authenticate,
  authorize('time_off:read'),
  asyncHandler(async (req, res) => sendOk(res, await timeOffService.calendar(req))),
);

router.use(
  '/types',
  registerCrudRoutes(Router(), leaveTypeService, {
    readPermission: 'time_off:read',
    writePermission: 'time_off:manage',
    createSchema: leaveTypeSchema,
    updateSchema: leaveTypeSchema.partial(),
  }),
);

router.use(
  '/holidays',
  registerCrudRoutes(Router(), holidayService, {
    readPermission: 'time_off:read',
    writePermission: 'time_off:manage',
    createSchema: holidaySchema,
    updateSchema: holidaySchema.partial(),
  }),
);

export default router;
