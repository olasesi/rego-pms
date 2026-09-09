import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { reviewService } from './reviews.service';

const router = Router();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cycleId: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  userId: z.coerce.number().int().positive().optional(),
}).passthrough();

const participantSchema = z.object({
  reviewerId: z.number().int().positive(),
  role: z.enum(['self', 'manager', 'peer', 'subordinate', 'customer']),
  isAnonymous: z.boolean().optional(),
});

const submitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    rating: z.number().min(1).max(10).optional(),
    answer: z.string().max(3000).optional(),
  })),
  comments: z.string().max(3000).optional(),
});

const statusSchema = z.object({
  status: z.enum([
    'draft',
    'in_progress',
    'self_completed',
    'peer_reviewed',
    'manager_reviewed',
    'approved',
    'signed_off',
    'needs_improvement',
  ]),
});

router.get('/', authenticate, authorize('reviews:read'), validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const { rows, meta } = await reviewService.list(req);
  return sendOk(res, rows, meta);
}));

router.get('/:id/pending', authenticate, asyncHandler(async (req, res) => {
  const pending = await reviewService.myPending(parseId(req.params.id), req);
  return sendOk(res, pending);
}));

router.get('/:id', authenticate, authorize('reviews:read'), asyncHandler(async (req, res) => {
  const review = await reviewService.findById(parseId(req.params.id), req);
  return sendOk(res, review);
}));

router.post('/', authenticate, authorize('reviews:manage'), validate(z.object({ cycleId: z.number().int().positive(), userIds: z.array(z.number().int().positive()).min(1) })), asyncHandler(async (req, res) => {
  const reviews = await reviewService.bulkCreate(req.body.cycleId, req.body.userIds, req);
  return sendCreated(res, reviews);
}));

router.post('/:id/participants', authenticate, authorize('reviews:manage'), validate(participantSchema), asyncHandler(async (req, res) => {
  const participant = await reviewService.addParticipant(parseId(req.params.id), req.body, req);
  return sendCreated(res, participant);
}));

router.delete('/:id/participants/:participantId', authenticate, authorize('reviews:manage'), asyncHandler(async (req, res) => {
  await reviewService.removeParticipant(parseId(req.params.id), parseId(req.params.participantId), req);
  return sendEmpty(res);
}));

router.post('/:id/submit', authenticate, authorize('reviews:self', 'reviews:assess'), validate(submitSchema), asyncHandler(async (req, res) => {
  await reviewService.submitAssessment(parseId(req.params.id), req.body, req);
  return sendOk(res, { success: true }, undefined, 'Assessment submitted');
}));

router.post('/:id/approve', authenticate, authorize('reviews:approve'), asyncHandler(async (req, res) => {
  const review = await reviewService.approve(parseId(req.params.id), req);
  return sendOk(res, review);
}));

router.post('/:id/sign-off', authenticate, authorize('reviews:finalize'), asyncHandler(async (req, res) => {
  const review = await reviewService.signOff(parseId(req.params.id), req);
  return sendOk(res, review);
}));

router.patch('/:id/status', authenticate, authorize('reviews:manage'), validate(statusSchema), asyncHandler(async (req, res) => {
  const review = await reviewService.changeStatus(parseId(req.params.id), req.body.status, req);
  return sendOk(res, review);
}));

router.delete('/:id', authenticate, authorize('reviews:manage'), asyncHandler(async (req, res) => {
  await reviewService.remove(parseId(req.params.id), req);
  return sendEmpty(res);
}));

export default router;