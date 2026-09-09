import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

export const notFound = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, 'system.notFound'));
};

export default notFound;