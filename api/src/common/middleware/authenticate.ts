import type { NextFunction, Request, Response } from 'express';
import { User, Role, Permission } from '../../models';
import { cache } from '../services/cache';
import { verifyAccessToken } from '../security/tokens';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import type { AuthUser } from '../types';

async function loadAuthContext(userId: number): Promise<AuthUser | null> {
  return cache.wrap<AuthUser | null>(`auth:ctx:${userId}`, 5, async () => {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'orgId', 'email', 'firstName', 'lastName', 'locale', 'timezone', 'status'],
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          include: [{ model: Permission, as: 'permissions', through: { attributes: [] }, attributes: ['key'] }],
        },
      ],
    });
    if (!user) return null;
    const roles = new Set<string>();
    const permissions = new Set<string>();
    for (const role of user.roles ?? []) {
      roles.add(role.key);
      for (const permission of role.permissions ?? []) permissions.add(permission.key);
    }
    return {
      id: user.id,
      orgId: user.orgId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      locale: user.locale,
      timezone: user.timezone,
      roles: [...roles],
      permissions: [...permissions],
      isActive: user.status === 'active',
    };
  });
}

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'auth.unauthorized');
  }
  const token = header.slice(7);
  const payload = verifyAccessToken(token);
  if (!payload) {
    throw new ApiError(401, 'auth.invalidToken');
  }

  const user = await loadAuthContext(Number(payload.sub));
  if (!user || !user.isActive) {
    throw new ApiError(401, 'auth.unauthorized');
  }

  req.user = user;
  req.tenantId = user.orgId;

  const headerTenant = Number(req.headers['x-tenant-id']);
  if (Number.isFinite(headerTenant) && headerTenant > 0 && user.roles.includes('super_admin')) {
    req.tenantId = headerTenant;
  }
  next();
});

export default authenticate;