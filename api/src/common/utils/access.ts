import type { Request } from 'express';
import { ApiError } from './ApiError';

/** True when the caller holds the given permission key. */
export const hasPermission = (req: Request, key: string): boolean =>
  Boolean(req.user?.permissions?.includes(key));

/** True for super admins and organization-wide administrators. */
export const isAdmin = (req: Request): boolean => {
  const roles = req.user?.roles ?? [];
  return roles.includes('super_admin') || roles.includes('org_admin');
};

/** The authenticated user id, or a 401 when the request was not authenticated. */
export const actorId = (req: Request): number => {
  if (!req.user) throw new ApiError(401, 'auth.unauthorized');
  return req.user.id;
};

/**
 * Require that the caller is either privileged (admin/HR or holds the manage
 * permission) or is one of the supplied user ids.
 */
export const requireSelfOr = (
  req: Request,
  userIds: Array<number | null | undefined>,
  managePermission: string,
): void => {
  const id = actorId(req);
  if (isAdmin(req) || hasPermission(req, managePermission)) return;
  if (userIds.some((uid) => uid != null && Number(uid) === id)) return;
  throw new ApiError(403, 'auth.forbidden', undefined, 'FORBIDDEN');
};

/** Build a tenant scope object for models that carry `orgId`. */
export const tenantScope = (req: Request): Record<string, number> =>
  req.tenantId != null ? { orgId: req.tenantId } : {};

/** Normalise a comma separated date list / array of ids. */
export const toIdList = (value: unknown): number[] => {
  if (Array.isArray(value)) return value.map(Number).filter((v) => Number.isInteger(v) && v > 0);
  if (typeof value === 'string' && value.trim() !== '') {
    return value
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v > 0);
  }
  return [];
};
