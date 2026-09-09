import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { reviewTemplateService } from './reviewTemplates.service';

const router = Router();

const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: z.string().max(2000).optional(),
  isDefault: z.boolean().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

const createQuestionSchema = z.object({
  section: z.string().max(180).optional(),
  title: z.string().trim().min(1).max(255),
  type: z.enum(['rating', 'text', 'choice', 'multi_choice']).optional(),
  options: z.array(z.string()).optional(),
  weight: z.number().positive().optional(),
  required: z.boolean().optional(),
  maxRating: z.number().int().min(2).max(10).optional(),
  sortOrder: z.number().int().optional(),
});

const updateQuestionSchema = createQuestionSchema.partial();

registerCrudRoutes(router, reviewTemplateService, {
  readPermission: 'templates:read',
  writePermission: 'templates:manage',
  createSchema: createTemplateSchema,
  updateSchema: updateTemplateSchema,
});

router.post('/:id/questions', authenticate, authorize('templates:manage'), validate(createQuestionSchema), asyncHandler(async (req, res) => {
  const question = await reviewTemplateService.addQuestion(parseId(req.params.id), req.body, req);
  return sendCreated(res, question);
}));

router.patch('/:id/questions/:questionId', authenticate, authorize('templates:manage'), validate(updateQuestionSchema), asyncHandler(async (req, res) => {
  const question = await reviewTemplateService.updateQuestion(parseId(req.params.id), parseId(req.params.questionId), req.body, req);
  return sendOk(res, question);
}));

router.delete('/:id/questions/:questionId', authenticate, authorize('templates:manage'), asyncHandler(async (req, res) => {
  await reviewTemplateService.removeQuestion(parseId(req.params.id), parseId(req.params.questionId), req);
  return sendEmpty(res);
}));

export default router;