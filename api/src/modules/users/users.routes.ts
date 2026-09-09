import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { userService } from './users.service';

const router = Router();

const createUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128).optional(),
  title: z.string().trim().max(140).optional(),
  departmentId: z.number().int().positive().optional(),
  managerId: z.number().int().positive().optional(),
  timezone: z.string().max(60).optional(),
  locale: z.string().max(10).optional(),
  startDate: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern', 'other']).optional(),
});

const updateUserSchema = createUserSchema
  .partial()
  .omit({ email: true })
  .extend({ status: z.enum(['active', 'invited', 'inactive', 'terminated']).optional() });

const setRolesSchema = z.object({
  roleIds: z.array(z.number().int().positive()).default([]),
});

const setTeamsSchema = z.object({
  teamIds: z.array(z.number().int().positive()).default([]),
});

const importSchema = z.object({
  csv: z.string().min(1),
});

router.post('/import', authenticate, authorize('users:import'), validate(importSchema), asyncHandler(async (req, res) => {
  const result = await userService.importCsv(req.body.csv, req);
  return sendOk(res, result);
}));

router.get('/direct-reports', authenticate, authorize('users:read'), asyncHandler(async (req, res) => {
  const users = await userService.getDirectReports(req.user!.id);
  return sendOk(res, users);
}));

registerCrudRoutes(router, userService, {
  readPermission: 'users:read',
  writePermission: 'users:update',
  createSchema: createUserSchema,
  updateSchema: updateUserSchema,
});

router.post('/:id/roles', authenticate, authorize('users:manage'), validate(setRolesSchema), asyncHandler(async (req, res) => {
  const user = await userService.updateRoles(parseId(req.params.id), req.body.roleIds, req);
  return sendOk(res, user);
}));

router.post('/:id/teams', authenticate, authorize('users:manage'), validate(setTeamsSchema), asyncHandler(async (req, res) => {
  const user = await userService.addToTeams(parseId(req.params.id), req.body.teamIds, req);
  return sendOk(res, user);
}));

export default router;