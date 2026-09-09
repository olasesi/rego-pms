import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { asyncHandler, sendOk } from '../../common/utils/responses';
import { departmentService } from './departments.service';

const router = Router();

const createDeptSchema = z.object({
  name: z.string().trim().min(1).max(140),
  code: z.string().trim().max(40).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  headUserId: z.number().int().positive().nullable().optional(),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().optional(),
});

const updateDeptSchema = createDeptSchema.partial();

router.get('/tree', authenticate, authorize('departments:read'), asyncHandler(async (req, res) => {
  const tree = await departmentService.tree(req.tenantId ?? null);
  return sendOk(res, tree);
}));

registerCrudRoutes(router, departmentService, {
  readPermission: 'departments:read',
  writePermission: 'departments:manage',
  createSchema: createDeptSchema,
  updateSchema: updateDeptSchema,
});

export default router;