import type { Request } from 'express';
import { Op } from 'sequelize';
import { Department, User } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';

const deptIncludes = [
  { model: User, as: 'head', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: Department, as: 'parent', attributes: ['id', 'name'] },
];

export class DepartmentService extends CrudService {
  constructor() {
    super({
      model: Department,
      moduleKey: 'dept',
      tenantScoped: true,
      searchFields: ['name', 'code'],
      defaultSortBy: 'sortOrder',
      include: deptIncludes,
      detailInclude: deptIncludes,
      notFoundKey: 'dept.notFound',
      beforeCreate: (data) => data,
      validateCreate: async (data, req) => {
        await this.assertUniqueName(data.name as string, undefined, req.tenantId);
      },
      validateUpdate: async (data, id, req) => {
        if (data.name) await this.assertUniqueName(data.name as string, id, req.tenantId);
      },
    });
  }

  private async assertUniqueName(name: string, exceptId: number | undefined, orgId: number | null | undefined): Promise<void> {
    if (!name) return;
    const where: Record<string, unknown> = { name, ...(orgId != null ? { orgId } : {}) };
    if (exceptId) where.id = { [Op.ne]: exceptId };
    const existing = await Department.findOne({ where, attributes: ['id'] });
    if (existing) throw new ApiError(409, 'dept.nameExists');
  }

  async remove(id: number, req: Request): Promise<{ id: number; deleted: true }> {
    await this.findById(id, req);
    const children = await Department.count({ where: { parentId: id } });
    if (children > 0) throw new ApiError(400, 'dept.hasChildren');
    await Department.update({ parentId: null, headUserId: null }, { where: { id } });
    await this.cfg.model.destroy({ where: { ...this.scopeWhere(req), id } });
    return { id, deleted: true };
  }

  async tree(orgId: number | null): Promise<unknown[]> {
    const departments = await Department.findAll({
      where: orgId != null ? { orgId } : {},
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      raw: true,
    });
    const byId = new Map<number, Record<string, unknown> & { children?: unknown[] }>();
    const roots: unknown[] = [];
    for (const dept of departments) {
      byId.set(dept.id as number, { ...dept, children: [] });
    }
    for (const dept of departments) {
      const node = byId.get(dept.id as number)!;
      if (dept.parentId != null && byId.has(dept.parentId as number)) {
        (byId.get(dept.parentId as number)!.children as unknown[]).push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }
}

export const departmentService = new DepartmentService();
export default departmentService;