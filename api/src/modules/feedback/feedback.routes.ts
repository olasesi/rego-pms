import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { asyncHandler, sendOk } from '../../common/utils/responses';
import { buildOrder, buildWhere, getPagination, paginateMeta } from '../../common/utils/query';
import { feedbackService } from './feedback.service';
import { Feedback, User } from '../../models';

const router = Router();

const createFeedbackSchema = z.object({
  receiverId: z.number().int().positive(),
  type: z.enum(['praise', 'constructive', 'request', 'thanks']).optional(),
  title: z.string().trim().max(180).optional(),
  message: z.string().trim().min(1).max(3000),
  visibility: z.enum(['public', 'private']).optional(),
  recognizePoints: z.number().int().min(0).optional(),
});

router.get('/feed', authenticate, authorize('feedback:read'), asyncHandler(async (req, res) => {
  const result = await feedbackService.list(req);
  return sendOk(res, result.rows, result.meta);
}));

router.get('/mine', authenticate, authorize('feedback:read'), asyncHandler(async (req, res) => {
  const scope = req.tenantId != null ? { orgId: req.tenantId } : {};
  const where = { ...buildWhere(req, {}, scope), receiverId: req.user!.id };
  const { page, limit, offset } = getPagination(req.query);
  const order = buildOrder(req, { defaultSortBy: 'createdAt' });
  const { rows, count } = await Feedback.findAndCountAll({
    where,
    order,
    limit,
    offset,
    distinct: true,
    include: [
      { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] },
      { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'email'] },
    ],
  });
  return sendOk(res, rows, paginateMeta(page, limit, count));
}));

registerCrudRoutes(router, feedbackService, {
  readPermission: 'feedback:read',
  writePermission: 'feedback:create',
  createSchema: createFeedbackSchema,
  exclude: ['update', 'delete'],
});

export default router;