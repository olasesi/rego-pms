import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { surveyService } from './surveys.service';

const router = Router();

const createSurveySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  type: z.enum(['engagement', 'enps', 'pulse', 'custom']).optional(),
  status: z.enum(['draft', 'active', 'closed', 'archived']).optional(),
  isAnonymous: z.boolean().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  audience: z.record(z.unknown()).nullable().optional(),
  settings: z.record(z.unknown()).nullable().optional(),
});

const updateSurveySchema = createSurveySchema.partial();

const questionSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().max(3000).nullable().optional(),
  type: z.enum(['rating', 'enps', 'text', 'single_choice', 'multi_choice', 'boolean']).optional(),
  options: z.array(z.string()).nullable().optional(),
  required: z.boolean().optional(),
  maxRating: z.number().int().min(2).max(10).optional(),
  sortOrder: z.number().int().optional(),
});

const updateQuestionSchema = questionSchema.partial();

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        rating: z.number().nullable().optional(),
        answer: z.string().nullable().optional(),
        choice: z.union([z.string(), z.array(z.string())]).nullable().optional(),
      }),
    )
    .min(1),
});

router.get(
  '/available',
  authenticate,
  authorize('surveys:respond'),
  asyncHandler(async (req, res) => sendOk(res, await surveyService.available(req))),
);

router.get(
  '/:id/analytics',
  authenticate,
  authorize('surveys:read'),
  asyncHandler(async (req, res) => sendOk(res, await surveyService.analytics(parseId(req.params.id), req))),
);

router.post(
  '/:id/questions',
  authenticate,
  authorize('surveys:manage'),
  validate(questionSchema),
  asyncHandler(async (req, res) => sendCreated(res, await surveyService.addQuestion(parseId(req.params.id), req.body, req))),
);

router.patch(
  '/:id/questions/:questionId',
  authenticate,
  authorize('surveys:manage'),
  validate(updateQuestionSchema),
  asyncHandler(async (req, res) =>
    sendOk(res, await surveyService.updateQuestion(parseId(req.params.id), parseId(req.params.questionId), req.body, req)),
  ),
);

router.delete(
  '/:id/questions/:questionId',
  authenticate,
  authorize('surveys:manage'),
  asyncHandler(async (req, res) => {
    await surveyService.removeQuestion(parseId(req.params.id), parseId(req.params.questionId), req);
    return sendEmpty(res);
  }),
);

router.post(
  '/:id/launch',
  authenticate,
  authorize('surveys:manage'),
  asyncHandler(async (req, res) => sendOk(res, await surveyService.launch(parseId(req.params.id), req))),
);

router.post(
  '/:id/close',
  authenticate,
  authorize('surveys:manage'),
  asyncHandler(async (req, res) => sendOk(res, await surveyService.close(parseId(req.params.id), req))),
);

router.post(
  '/:id/submit',
  authenticate,
  authorize('surveys:respond'),
  validate(submitSchema),
  asyncHandler(async (req, res) => sendCreated(res, await surveyService.submit(parseId(req.params.id), req.body, req))),
);

registerCrudRoutes(router, surveyService, {
  readPermission: 'surveys:read',
  writePermission: 'surveys:manage',
  createSchema: createSurveySchema,
  updateSchema: updateSurveySchema,
});

export default router;
