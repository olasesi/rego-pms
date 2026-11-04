import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { oneOnOneService } from './oneOnOnes.service';

const router = Router();

const createSeriesSchema = z.object({
  managerId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  title: z.string().max(180).nullable().optional(),
  cadence: z.enum(['weekly', 'biweekly', 'monthly', 'custom']).optional(),
  nextMeetingAt: z.string().datetime().nullable().optional(),
  status: z.enum(['active', 'paused', 'ended']).optional(),
});

const updateSeriesSchema = createSeriesSchema.partial().omit({ managerId: true, employeeId: true });

const createMeetingSchema = z.object({
  scheduledAt: z.string().datetime(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  managerNotes: z.string().max(10000).nullable().optional(),
  employeeNotes: z.string().max(10000).nullable().optional(),
  sharedNotes: z.string().max(10000).nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

const updateMeetingSchema = createMeetingSchema.partial();

const agendaItemSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  category: z.enum(['talking_point', 'win', 'blocker', 'action_item', 'feedback']).optional(),
  status: z.enum(['open', 'discussed', 'done']).optional(),
  isPrivate: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const updateAgendaItemSchema = agendaItemSchema.partial();

// Static / nested routes must be declared before the generic CRUD routes.
router.get(
  '/mine',
  authenticate,
  authorize('one_on_ones:read'),
  asyncHandler(async (req, res) => sendOk(res, await oneOnOneService.mine(req))),
);

router.get(
  '/upcoming',
  authenticate,
  authorize('one_on_ones:read'),
  asyncHandler(async (req, res) => sendOk(res, await oneOnOneService.upcoming(req))),
);

router.get(
  '/:id/meetings',
  authenticate,
  authorize('one_on_ones:read'),
  asyncHandler(async (req, res) => sendOk(res, await oneOnOneService.listMeetings(parseId(req.params.id), req))),
);

router.post(
  '/:id/meetings',
  authenticate,
  authorize('one_on_ones:manage'),
  validate(createMeetingSchema),
  asyncHandler(async (req, res) => sendCreated(res, await oneOnOneService.createMeeting(parseId(req.params.id), req.body, req))),
);

router.patch(
  '/meetings/:meetingId',
  authenticate,
  authorize('one_on_ones:read'),
  validate(updateMeetingSchema),
  asyncHandler(async (req, res) => sendOk(res, await oneOnOneService.updateMeeting(parseId(req.params.meetingId), req.body, req))),
);

router.delete(
  '/meetings/:meetingId',
  authenticate,
  authorize('one_on_ones:manage'),
  asyncHandler(async (req, res) => {
    await oneOnOneService.removeMeeting(parseId(req.params.meetingId), req);
    return sendEmpty(res);
  }),
);

router.post(
  '/meetings/:meetingId/agenda-items',
  authenticate,
  authorize('one_on_ones:read'),
  validate(agendaItemSchema),
  asyncHandler(async (req, res) => sendCreated(res, await oneOnOneService.addAgendaItem(parseId(req.params.meetingId), req.body, req))),
);

router.patch(
  '/agenda-items/:itemId',
  authenticate,
  authorize('one_on_ones:read'),
  validate(updateAgendaItemSchema),
  asyncHandler(async (req, res) => sendOk(res, await oneOnOneService.updateAgendaItem(parseId(req.params.itemId), req.body, req))),
);

router.delete(
  '/agenda-items/:itemId',
  authenticate,
  authorize('one_on_ones:read'),
  asyncHandler(async (req, res) => {
    await oneOnOneService.removeAgendaItem(parseId(req.params.itemId), req);
    return sendEmpty(res);
  }),
);

registerCrudRoutes(router, oneOnOneService, {
  readPermission: 'one_on_ones:read',
  writePermission: 'one_on_ones:manage',
  createSchema: createSeriesSchema,
  updateSchema: updateSeriesSchema,
});

export default router;
