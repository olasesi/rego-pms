import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'query' | 'params';

export const formatZodIssues = (error: z.ZodError): Record<string, unknown> => {
  const details: Record<string, unknown> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (details[path] === undefined) {
      details[path] = issue.message;
    }
  }
  return details;
};

export const validate =
  (schema: z.ZodTypeAny, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new ApiError(400, 'validation.failed', formatZodIssues(result.error), 'VALIDATION_ERROR'));
    }
    (req as any)[source] = result.data;
    return next();
  };

export default validate;