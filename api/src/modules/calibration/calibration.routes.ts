import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { calibrationService } from './calibration.service';

const router = Router();

const boxEnum = z.enum([
  'low_impact',
  'moderate_impact',
  'high_impact',
  'inconsistent',
  'core',
  'high_performer',
  'risk',
  'high_potential',
  'star',
]);

const sessionSchema = z.object({
  name: z.string().trim().min(1).max(180),
  cycleId: z.number().int().positive().nullable().optional(),
  status: z.enum(['draft', 'in_progress', 'completed']).optional(),
  facilitatorId: z.number().int().positive().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  settings: z.record(z.unknown()).nullable().optional(),
});

const participantSchema = z.object({
  userId: z.number().int().positive(),
  managerId: z.number().int().positive().nullable().optional(),
  performanceRating: z.number().min(1).max(5).nullable().optional(),
  potentialRating: z.number().min(1).max(5).nullable().optional(),
  box: boxEnum.nullable().optional(),
  proposedRating: z.number().min(1).max(5).nullable().optional(),
  finalRating: z.number().min(1).max(5).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

const updateParticipantSchema = participantSchema.partial().omit({ userId: true });

router.get(
  '/:id/matrix',
  authenticate,
  authorize('calibration:read'),
  asyncHandler(async (req, res) => sendOk(res, await calibrationService.matrix(parseId(req.params.id), req))),
);

router.post(
  '/:id/participants',
  authenticate,
  authorize('calibration:manage'),
  validate(participantSchema),
  asyncHandler(async (req, res) => sendCreated(res, await calibrationService.addParticipant(parseId(req.params.id), req.body, req))),
);

router.patch(
  '/:id/participants/:participantId',
  authenticate,
  authorize('calibration:manage'),
  validate(updateParticipantSchema),
  asyncHandler(async (req, res) =>
    sendOk(res, await calibrationService.updateParticipant(parseId(req.params.id), parseId(req.params.participantId), req.body, req)),
  ),
);

router.delete(
  '/:id/participants/:participantId',
  authenticate,
  authorize('calibration:manage'),
  asyncHandler(async (req, res) => {
    await calibrationService.removeParticipant(parseId(req.params.id), parseId(req.params.participantId), req);
    return sendEmpty(res);
  }),
);

router.post(
  '/:id/complete',
  authenticate,
  authorize('calibration:manage'),
  asyncHandler(async (req, res) => sendOk(res, await calibrationService.complete(parseId(req.params.id), req))),
);

registerCrudRoutes(router, calibrationService, {
  readPermission: 'calibration:read',
  writePermission: 'calibration:manage',
  createSchema: sessionSchema,
  updateSchema: sessionSchema.partial(),
});

export default router;
