import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { teamService } from './teams.service';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(140),
  description: z.string().max(1000).optional(),
  leadUserId: z.number().int().positive().nullable().optional(),
});

const updateTeamSchema = createTeamSchema.partial();

const addMemberSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['member', 'lead']).optional(),
});

registerCrudRoutes(router, teamService, {
  readPermission: 'teams:read',
  writePermission: 'teams:manage',
  createSchema: createTeamSchema,
  updateSchema: updateTeamSchema,
});

router.post('/:id/members', authenticate, authorize('teams:manage'), validate(addMemberSchema), asyncHandler(async (req, res) => {
  await teamService.addMember(parseId(req.params.id), req.body.userId, req.body.role ?? 'member', req);
  return sendOk(res, { success: true }, undefined, 'Member added');
}));

router.delete('/:id/members/:userId', authenticate, authorize('teams:manage'), asyncHandler(async (req, res) => {
  await teamService.removeMember(parseId(req.params.id), parseId(req.params.userId), req);
  return sendEmpty(res);
}));

export default router;