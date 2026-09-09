import { Op } from 'sequelize';
import { Organization, AppSetting, User } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { slugify } from '../../common/utils/helpers';

export class OrganizationService extends CrudService {
  constructor() {
    super({
      model: Organization,
      moduleKey: 'org',
      searchFields: ['name', 'legalName', 'code'],
      defaultSortBy: 'createdAt',
      notFoundKey: 'org.notFound',
      beforeCreate: (data) => {
        const name = String(data.name ?? '').trim();
        if (!data.slug) data.slug = slugify(name);
        return data;
      },
      validateCreate: async (data) => {
        if (data.slug) {
          const existing = await Organization.findOne({ where: { slug: data.slug }, attributes: ['id'] });
          if (existing) throw new ApiError(409, 'org.slugExists');
        }
      },
    });
  }

  async getSettings(orgId: number): Promise<Record<string, unknown>> {
    const rows = await AppSetting.findAll({ where: { [Op.or]: [{ orgId }, { orgId: null }] }, order: [['orgId', 'ASC']] });
    const merged: Record<string, unknown> = {};
    for (const row of rows) {
      merged[row.key] = row.value;
    }
    return merged;
  }

  async setSettings(orgId: number, settings: Record<string, unknown>, updatedById: number | null): Promise<Record<string, unknown>> {
    const org = await Organization.findByPk(orgId, { attributes: ['id'] });
    if (!org) throw new ApiError(404, 'org.notFound');

    for (const [key, value] of Object.entries(settings)) {
      const [setting] = await AppSetting.findOrCreate({
        where: { orgId, key },
        defaults: { orgId, key, value, category: 'general', updatedById },
      });
      if (setting) {
        await setting.update({ value, updatedById });
      }
    }
    return this.getSettings(orgId);
  }

  async stats(orgId: number): Promise<Record<string, number>> {
    const [activeUsers] = await Promise.all([
      User.count({ where: { orgId, status: 'active' } }),
      User.count({ where: { orgId } }),
    ]);
    return { total: await User.count({ where: { orgId } }), active: activeUsers };
  }
}

export const organizationService = new OrganizationService();
export default organizationService;