import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { asyncHandler, sendOk, sendCreated } from '../../common/utils/responses';
import { parseId } from '../../common/utils/query';
import { documentService, documentTemplateService } from './documents.service';

const router = Router();

const templateSchema = z.object({
  name: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(5000).nullable().optional(),
  content: z.string().min(1),
  version: z.number().int().positive().optional(),
  requiresAcknowledgement: z.boolean().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

const sendSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

const adHocSchema = z.object({
  userId: z.number().int().positive(),
  templateId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  category: z.string().max(80).optional(),
  fileUrl: z.string().url().nullable().optional(),
  content: z.string().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

router.get(
  '/employee-documents/mine',
  authenticate,
  authorize('documents:read'),
  asyncHandler(async (req, res) => sendOk(res, await documentService.mine(req))),
);

router.get(
  '/employee-documents',
  authenticate,
  authorize('documents:read'),
  asyncHandler(async (req, res) => sendOk(res, await documentService.list(req))),
);

router.get(
  '/employee-documents/:id',
  authenticate,
  authorize('documents:read'),
  asyncHandler(async (req, res) => sendOk(res, await documentService.findById(parseId(req.params.id), req))),
);

router.post(
  '/employee-documents',
  authenticate,
  authorize('documents:manage'),
  validate(adHocSchema),
  asyncHandler(async (req, res) => sendCreated(res, await documentService.sendAdHoc(req.body, req))),
);

router.patch(
  '/employee-documents/:id/acknowledge',
  authenticate,
  authorize('documents:read'),
  asyncHandler(async (req, res) => sendOk(res, await documentService.acknowledge(parseId(req.params.id), req))),
);

router.post(
  '/templates/:id/send',
  authenticate,
  authorize('documents:manage'),
  validate(sendSchema),
  asyncHandler(async (req, res) =>
    sendCreated(res, await documentService.send(parseId(req.params.id), req.body.userIds, req.body, documentTemplateService, req)),
  ),
);

router.post(
  '/templates/:id/publish',
  authenticate,
  authorize('documents:manage'),
  asyncHandler(async (req, res) => sendOk(res, await documentTemplateService.publishVersion(parseId(req.params.id), req))),
);

router.use(
  '/templates',
  registerCrudRoutes(Router(), documentTemplateService, {
    readPermission: 'documents:read',
    writePermission: 'documents:manage',
    createSchema: templateSchema,
    updateSchema: templateSchema.partial(),
  }),
);

export default router;
