import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { competencyService } from './competencies.service';

const router = Router();

const createFrameworkSchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: z.string().max(2000).optional(),
});

const updateFrameworkSchema = createFrameworkSchema.partial().extend({
  status: z.enum(['active', 'archived']).optional(),
});

const createCompetencySchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: z.string().max(2000).optional(),
  category: z.string().max(120).optional(),
  weight: z.number().positive().optional(),
  maxLevel: z.number().int().min(2).max(10).optional(),
  sortOrder: z.number().int().optional(),
});

const updateCompetencySchema = createCompetencySchema.partial();

const assessSchema = z.object({
  userId: z.number().int().positive(),
  competencyId: z.number().int().positive(),
  level: z.number().int().min(1).max(10),
  type: z.enum(['self', 'manager']).optional(),
  evidence: z.string().max(2000).optional(),
});

registerCrudRoutes(router, competencyService, {
  readPermission: 'competencies:read',
  writePermission: 'competencies:manage',
  createSchema: createFrameworkSchema,
  updateSchema: updateFrameworkSchema,
});

router.post('/:id/competencies', authenticate, authorize('competencies:manage'), validate(createCompetencySchema), asyncHandler(async (req, res) => {
  const competency = await competencyService.addCompetency(parseId(req.params.id), req.body, req);
  return sendCreated(res, competency);
}));

router.patch('/:id/competencies/:competencyId', authenticate, authorize('competencies:manage'), validate(updateCompetencySchema), asyncHandler(async (req, res) => {
  const competency = await competencyService.updateCompetency(parseId(req.params.id), parseId(req.params.competencyId), req.body, req);
  return sendOk(res, competency);
}));

router.delete('/:id/competencies/:competencyId', authenticate, authorize('competencies:manage'), asyncHandler(async (req, res) => {
  await competencyService.removeCompetency(parseId(req.params.id), parseId(req.params.competencyId), req);
  return sendEmpty(res);
}));

router.post('/assessments', authenticate, authorize('competencies:assess'), validate(assessSchema), asyncHandler(async (req, res) => {
  const assessment = await competencyService.assess(req.body, req);
  return sendCreated(res, assessment);
}));

router.get('/gap-analysis/:userId', authenticate, authorize('competencies:read'), asyncHandler(async (req, res) => {
  const analysis = await competencyService.gapAnalysis(parseId(req.params.userId), req);
  return sendOk(res, analysis);
}));

export default router;