import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

export const authorize =
  (...required: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) return next(new ApiError(401, 'auth.unauthorized'));
    if (user.roles.includes('super_admin')) return next();
    const missing = required.filter((permission) => !user.permissions.includes(permission));
    if (missing.length > 0) {
      return next(new ApiError(403, 'auth.forbidden', undefined, 'FORBIDDEN'));
    }
    return next();
  };

export default authorize;