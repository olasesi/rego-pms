import type { Request } from 'express';
import { Op } from 'sequelize';
import { Role, Permission, RolePermission } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { buildOrder, buildWhere, getPagination, paginateMeta } from '../../common/utils/query';
import { PERMISSION_LIST } from '../../common/constants/permissions';
import type { ListResult } from '../../common/types';

const permissionsInclude = [
  {
    model: Permission,
    as: 'permissions',
    through: { attributes: [] },
    attributes: ['id', 'key', 'name', 'module'],
  },
];

export class RoleService extends CrudService {
  constructor() {
    super({
      model: Role,
      moduleKey: 'role',
      searchFields: ['name', 'key'],
      defaultSortBy: 'createdAt',
      include: permissionsInclude,
      detailInclude: permissionsInclude,
      notFoundKey: 'role.notFound',
    });
  }

  protected canViewRole(role: { orgId: number | null }, req: Request): boolean {
    if (req.user?.roles.includes('super_admin')) return true;
    if (role.orgId === null) return true; // system roles are readable by everyone
    return role.orgId === req.tenantId;
  }

  async list(req: Request): Promise<ListResult<any>> {
    const scope =
      req.tenantId != null
        ? { [Op.or]: [{ orgId: null }, { orgId: req.tenantId }] }
        : {};
    const where = buildWhere(req, { searchFields: ['name', 'key'] }, scope);
    const { page, limit, offset } = getPagination(req.query);
    const order = buildOrder(req, { defaultSortBy: 'createdAt' });
    const { rows, count } = await this.cfg.model.findAndCountAll({
      where,
      include: permissionsInclude,
      order,
      limit,
      offset,
      distinct: true,
    });
    return { rows, meta: paginateMeta(page, limit, count) };
  }

  async findById(id: number, req: Request): Promise<any> {
    const role = await Role.findByPk(id, { include: permissionsInclude });
    if (!role) throw new ApiError(404, 'role.notFound');
    if (!this.canViewRole(role, req)) throw new ApiError(403, 'auth.forbidden');
    return role;
  }

  async create(body: { name: string; key: string; description?: string; permissionKeys?: string[] }, req: Request): Promise<any> {
    const key = String(body.key ?? body.name).trim().toLowerCase().replace(/\s+/g, '_');
    const orgId = req.tenantId ?? null;
    const existing = await Role.findOne({ where: { key, orgId }, attributes: ['id'] });
    if (existing) throw new ApiError(409, 'role.keyExists');

    const role = await Role.create({
      orgId,
      name: body.name,
      key,
      description: body.description ?? null,
      isSystem: false,
    });
    await this.syncPermissions(role.id, body.permissionKeys ?? []);
    return this.findById(role.id, req);
  }

  async update(id: number, body: { name?: string; description?: string; permissionKeys?: string[] }, req: Request): Promise<any> {
    const role = await this.findById(id, req);
    if (role.isSystem) throw new ApiError(400, 'role.systemRoleLocked');
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (Object.keys(patch).length > 0) await role.update(patch);
    if (body.permissionKeys !== undefined) {
      await this.syncPermissions(id, body.permissionKeys);
    }
    return this.findById(id, req);
  }

  async remove(id: number, req: Request): Promise<{ id: number; deleted: true }> {
    const role = await this.findById(id, req);
    if (role.isSystem) throw new ApiError(400, 'role.systemRoleLocked');
    await role.destroy();
    return { id, deleted: true };
  }

  async catalog(): Promise<Record<string, PermissionDefinitionLike[]>> {
    return PERMISSION_LIST.reduce<Record<string, PermissionDefinitionLike[]>>((acc, permission) => {
      if (!acc[permission.module]) acc[permission.module] = [];
      acc[permission.module].push({ key: permission.key, description: permission.description });
      return acc;
    }, {});
  }

  private async syncPermissions(roleId: number, permissionKeys: string[]): Promise<void> {
    if (permissionKeys.length === 0) {
      await RolePermission.destroy({ where: { roleId } });
      return;
    }
    const permissions = await Permission.findAll({ where: { key: { [Op.in]: permissionKeys } }, attributes: ['id'] });
    const permissionIds = permissions.map((p) => p.id);
    await RolePermission.destroy({ where: { roleId, permissionId: { [Op.notIn]: permissionIds } } });
    await RolePermission.bulkCreate(
      permissionIds.map((permissionId) => ({ roleId, permissionId })),
      { ignoreDuplicates: true },
    );
  }
}

export interface PermissionDefinitionLike {
  key: string;
  description: string;
}

export const roleService = new RoleService();
export default roleService;