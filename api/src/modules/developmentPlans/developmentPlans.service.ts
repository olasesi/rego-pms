import type { Request } from 'express';
import { DevelopmentPlan, DevelopmentActivity, User } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';

const planIncludes = [
  { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: DevelopmentActivity, as: 'activities' },
];

export class DevelopmentPlanService extends CrudService {
  constructor() {
    super({
      model: DevelopmentPlan,
      moduleKey: 'plan',
      tenantScoped: true,
      searchFields: ['title', 'description'],
      filters: [{ field: 'status', type: 'eq' }, { field: 'userId', type: 'eq' }],
      defaultSortBy: 'createdAt',
      include: planIncludes,
      detailInclude: planIncludes,
      notFoundKey: 'plan.notFound',
      beforeCreate: (data, req) => {
        data.createdById = req.user!.id;
        return data;
      },
      validateCreate: (data) => {
        if (!data.userId) data.userId = undefined;
      },
    });
  }

  async addActivity(planId: number, body: Record<string, unknown>, req: Request): Promise<DevelopmentActivity> {
    await this.findById(planId, req);
    return DevelopmentActivity.create({
      planId,
      type: (body.type as DevelopmentActivity['type'] | undefined) ?? 'training',
      title: body.title as string,
      description: (body.description as string | undefined) ?? null,
      dueDate: body.dueDate != null ? new Date(body.dueDate as string) : null,
      link: (body.link as string | undefined) ?? null,
      sortOrder: (body.sortOrder as number | undefined) ?? 0,
    });
  }

  async updateActivity(planId: number, activityId: number, body: Record<string, unknown>, req: Request): Promise<DevelopmentActivity> {
    await this.findById(planId, req);
    const activity = await DevelopmentActivity.findOne({ where: { id: activityId, planId } });
    if (!activity) throw new ApiError(404, 'plan.activityNotFound');
    const patch: Record<string, unknown> = {};
    for (const field of ['type', 'title', 'description', 'status', 'progress', 'dueDate', 'completedAt', 'link', 'sortOrder'] as const) {
      if (body[field] !== undefined) patch[field] = body[field];
    }
    if (patch.status === 'completed') {
      patch.progress = 100;
      patch.completedAt = new Date();
    }
    await activity.update(patch);
    return activity.reload();
  }

  async removeActivity(planId: number, activityId: number, req: Request): Promise<{ id: number; deleted: true }> {
    await this.findById(planId, req);
    await DevelopmentActivity.destroy({ where: { id: activityId, planId } });
    return { id: activityId, deleted: true };
  }

  async listByUser(userId: number, status?: string): Promise<DevelopmentPlan[]> {
    return DevelopmentPlan.findAll({
      where: { userId, ...(status ? { status } : {}) },
      include: planIncludes,
      order: [['createdAt', 'DESC']],
    });
  }
}

export const developmentPlanService = new DevelopmentPlanService();
export default developmentPlanService;