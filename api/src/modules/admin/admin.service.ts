import type { Request } from 'express';
import { Op } from 'sequelize';
import { AppSetting, AuditLog, User } from '../../models';
import { ApiError } from '../../common/utils/ApiError';
import { buildOrder, getPagination, paginateMeta } from '../../common/utils/query';

export class AdminService {
  async listSettings(req: Request): Promise<Array<{ orgId: number | null; key: string; value: unknown; category: string }>> {
    const scope = req.tenantId != null ? { [Op.or]: [{ orgId: req.tenantId }, { orgId: null }] } : {};
    const rows = await AppSetting.findAll({ where: scope, order: [['category', 'ASC'], ['key', 'ASC']] });
    return rows.map((r) => ({ orgId: r.orgId, key: r.key, value: r.value, category: r.category }));
  }

  async updateSetting(key: string, value: unknown, category: string | undefined, req: Request): Promise<void> {
    const orgId = req.tenantId ?? null;
    const existing = await AppSetting.findOne({ where: { key, orgId } });
    if (existing) {
      await existing.update({ value, category: category ?? existing.category, updatedById: req.user!.id });
    } else {
      await AppSetting.create({ key, value, category: category ?? 'general', orgId, updatedById: req.user!.id });
    }
  }

  async listAuditLogs(req: Request): Promise<{ rows: AuditLog[]; meta: any }> {
    const scope = req.tenantId != null ? { orgId: req.tenantId } : {};
    const where: any = { ...scope };
    if (req.query.userId) where.userId = Number(req.query.userId);
    if (req.query.entity) where.entity = String(req.query.entity);
    const { page, limit, offset } = getPagination(req.query);
    const order = buildOrder(req, { defaultSortBy: 'createdAt' });
    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [{ model: User, as: 'actor', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      distinct: true,
    });
    return { rows, meta: paginateMeta(page, limit, count) };
  }

  async taxi_exportUserData(userId: number, req: Request): Promise<Record<string, unknown>> {
    await this.assertSameTenant(userId, req);
    const user = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName', 'email', 'title', 'status', 'createdAt'] });
    if (!user) throw new ApiError(404, 'user.notFound');
    return { user };
  }

  async anonymizeUser(userId: number, req: Request): Promise<{ id: number; anonymized: true }> {
    await this.assertSameTenant(userId, req);
    const user = await User.findByPk(userId);
    if (!user) throw new ApiError(404, 'user.notFound');
    if (user.email === process.env.SEED_ADMIN_EMAIL) throw new ApiError(400, 'auth.forbidden');
    const anonymized = `anonymized-${userId}@invalid.local`;
    await user.update({
      firstName: 'Anonymized',
      lastName: 'User',
      email: anonymized,
      avatarUrl: null,
      employeeCode: null,
      title: null,
      status: 'inactive',
    });
    return { id: userId, anonymized: true };
  }

  async taxonomies(req: Request): Promise<Record<string, unknown>> {
    const orgId = req.tenantId;
    const scope = orgId != null ? { [Op.or]: [{ orgId }, { orgId: null }] } : {};
    const settings = await AppSetting.findAll({ where: scope });
    const grouped: Record<string, Record<string, unknown>> = {};
    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = s.value;
    }
    return grouped;
  }

  private async assertSameTenant(userId: number, req: Request): Promise<void> {
    const user = await User.findByPk(userId, { attributes: ['orgId'] });
    if (!user) throw new ApiError(404, 'user.notFound');
    if (req.tenantId != null && user.orgId !== req.tenantId) throw new ApiError(403, 'auth.forbidden');
  }
}

export const adminService = new AdminService();
export default adminService;