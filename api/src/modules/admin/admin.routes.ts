import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { adminService } from './admin.service';

const router = Router();

const updateSettingSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.any(),
  category: z.string().max(80).optional(),
});

router.get('/settings', authenticate, authorize('admin:settings'), asyncHandler(async (req, res) => {
  const settings = await adminService.listSettings(req);
  return sendOk(res, settings);
}));

router.put('/settings', authenticate, authorize('admin:settings'), validate(updateSettingSchema), asyncHandler(async (req, res) => {
  await adminService.updateSetting(req.body.key, req.body.value, req.body.category, req);
  return sendOk(res, { success: true }, undefined, 'Setting saved');
}));

router.get('/taxonomies', authenticate, authorize('admin:settings'), asyncHandler(async (req, res) => {
  const taxonomies = await adminService.taxonomies(req);
  return sendOk(res, taxonomies);
}));

router.get('/audit-logs', authenticate, authorize('admin:audit'), asyncHandler(async (req, res) => {
  const { rows, meta } = await adminService.listAuditLogs(req);
  return sendOk(res, rows, meta);
}));

router.post('/gdpr/export/:userId', authenticate, authorize('admin:settings'), asyncHandler(async (req, res) => {
  const data = await adminService.taxi_exportUserData(parseId(req.params.userId), req);
  return sendOk(res, data);
}));

router.post('/gdpr/anonymize/:userId', authenticate, authorize('admin:settings'), asyncHandler(async (req, res) => {
  const result = await adminService.anonymizeUser(parseId(req.params.userId), req);
  return sendOk(res, result);
}));

export default router;