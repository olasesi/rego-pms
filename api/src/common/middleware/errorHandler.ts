import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { log } from '../../config/logger';
import type { ApiErrorShape } from '../types';

const isApiError = (err: unknown): err is ApiError => err instanceof ApiError;

export function errorHandler(): (err: unknown, req: Request, res: Response, next: NextFunction) => void {
  return (err: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      return next(err);
    }

    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let key = 'common.serverError';
    let details: unknown;

    if (isApiError(err)) {
      statusCode = err.statusCode;
      key = err.translationKey;
      code = err.code ?? 'API_ERROR';
      details = err.details;
    } else if (err instanceof SyntaxError && 'status' in err && (err as unknown as { status?: number }).status === 400) {
      statusCode = 400;
      key = 'validation.invalidBody';
      code = 'INVALID_JSON';
    } else if ((err as { name?: string })?.name === 'SequelizeUniqueConstraintError') {
      statusCode = 409;
      key = 'common.badRequest';
      code = 'DUPLICATE_CONFLICT';
    } else if ((err as { name?: string })?.name === 'SequelizeValidationError') {
      statusCode = 422;
      key = 'validation.failed';
      code = 'DB_VALIDATION';
      details = (err as { errors?: Array<{ message: string }> }).errors?.map((e) => e.message);
    }

    if (statusCode >= 500) {
      log.error('Unhandled error', {
        requestId: req.requestId,
        path: req.originalUrl,
        method: req.method,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    } else {
      log.debug('Request error', {
        requestId: req.requestId,
        path: req.originalUrl,
        status: statusCode,
        key,
      });
    }

    const translate = (k: string): string => {
      if (typeof (req as Request).t === 'function') {
        return (req as unknown as { t: (x: string) => string }).t(k);
      }
      return k;
    };

    const exposed = isApiError(err) ? err.expose : false;
    const message = exposed ? key : translate(key);

    const body: ApiErrorShape = {
      success: false,
      error: { code, key, message, ...(details !== undefined ? { details } : {}) },
    };
    res.status(statusCode).json(body);
  };
}

export default errorHandler;