import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { asyncHandler, sendOk } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { notificationService } from './notifications.service';

const router = Router();

router.get('/mine', authenticate, authorize('notifications:read'), asyncHandler(async (req, res) => {
  const result = await notificationService.mine(req);
  return sendOk(res, result.rows, result.meta);
}));

router.post('/:id/read', authenticate, authorize('notifications:read'), asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(parseId(req.params.id), req);
  return sendOk(res, notification);
}));

router.post('/read-all', authenticate, authorize('notifications:read'), asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req);
  return sendOk(res, result);
}));

export default router;