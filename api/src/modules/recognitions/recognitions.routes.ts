import { Router } from 'express';
import { z } from 'zod';
import { registerCrudRoutes } from '../../common/routes/crudRoutes';
import { recognitionService } from './recognitions.service';

const router = Router();

const createRecognitionSchema = z.object({
  receiverId: z.number().int().positive(),
  message: z.string().trim().min(1).max(2000),
  points: z.number().int().min(0).optional(),
  badge: z.string().max(80).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

registerCrudRoutes(router, recognitionService, {
  readPermission: 'recognitions:read',
  writePermission: 'recognitions:create',
  createSchema: createRecognitionSchema,
  exclude: ['update', 'delete'],
});

export default router;