import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { roleService } from './roles.service';

const router = Router();

const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  key: z.string().trim().min(1).max(80).regex(/^[a-z0-9_]+$/).optional(),
  description: z.string().max(255).optional(),
  permissionKeys: z.array(z.string()).optional(),
});

const updateRoleSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(255).nullable().optional(),
  permissionKeys: z.array(z.string()).optional(),
});

router.get('/', authenticate, authorize('roles:read'), asyncHandler(async (req, res) => {
  const result = await roleService.list(req);
  res.set('X-Total-Count', String(result.meta.total));
  return sendOk(res, result.rows, result.meta);
}));

router.get('/permissions', authenticate, authorize('roles:read'), asyncHandler(async (_req, res) => {
  const catalog = await roleService.catalog();
  return sendOk(res, catalog);
}));

router.get('/:id', authenticate, authorize('roles:read'), asyncHandler(async (req, res) => {
  const role = await roleService.findById(parseId(req.params.id), req);
  return sendOk(res, role);
}));

router.post('/', authenticate, authorize('roles:manage'), validate(createRoleSchema), asyncHandler(async (req, res) => {
  const role = await roleService.create(req.body, req);
  return sendCreated(res, role);
}));

router.patch('/:id', authenticate, authorize('roles:manage'), validate(updateRoleSchema), asyncHandler(async (req, res) => {
  const role = await roleService.update(parseId(req.params.id), req.body, req);
  return sendOk(res, role);
}));

router.delete('/:id', authenticate, authorize('roles:manage'), asyncHandler(async (req, res) => {
  await roleService.remove(parseId(req.params.id), req);
  return sendEmpty(res);
}));

export default router;