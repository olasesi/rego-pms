import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { asyncHandler, sendOk, sendCreated, sendEmpty } from '../utils/responses';
import type { CrudService } from '../services/crud';
import { parseId } from '../utils/query';

export interface CrudRoutesOptions {
  readPermission: string;
  writePermission: string;
  createSchema?: z.ZodTypeAny;
  updateSchema?: z.ZodTypeAny;
  searchSchema?: z.ZodTypeAny;
  exclude?: Array<'create' | 'update' | 'delete'>;
}

const noop = (_req: Request, _res: Response, next: NextFunction): void => next();

export function registerCrudRoutes(
  router: Router,
  service: CrudService,
  options: CrudRoutesOptions,
): Router {
  const { readPermission, writePermission } = options;
  const can = (op: 'create' | 'update' | 'delete'): boolean => !(options.exclude ?? []).includes(op);

  router.get(
    '/',
    authenticate,
    authorize(readPermission),
    options.searchSchema ? validate(options.searchSchema, 'query') : noop,
    asyncHandler(async (req, res) => {
      const result = await service.list(req);
      res.set('X-Total-Count', String(result.meta.total));
      return sendOk(res, result.rows, result.meta);
    }),
  );

  if (can('create') && options.createSchema) {
    router.post(
      '/',
      authenticate,
      authorize(writePermission),
      validate(options.createSchema),
      asyncHandler(async (req, res) => {
        const record = await service.create(req.body, req);
        return sendCreated(res, record);
      }),
    );
  }

  router.get(
    '/:id',
    authenticate,
    authorize(readPermission),
    asyncHandler(async (req, res) => {
      const record = await service.findById(parseId(req.params.id), req);
      return sendOk(res, record);
    }),
  );

  if (can('update') && options.updateSchema) {
    router.patch(
      '/:id',
      authenticate,
      authorize(writePermission),
      validate(options.updateSchema),
      asyncHandler(async (req, res) => {
        const record = await service.update(parseId(req.params.id), req.body, req);
        return sendOk(res, record);
      }),
    );
  }

  if (can('delete')) {
    router.delete(
      '/:id',
      authenticate,
      authorize(writePermission),
      asyncHandler(async (req, res) => {
        await service.remove(parseId(req.params.id), req);
        return sendEmpty(res);
      }),
    );
  }

  return router;
}

export default registerCrudRoutes;