import type { Request } from 'express';
import { Goal, KeyResult, GoalCheckIn, User } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { clamp, round2 } from '../../common/utils/helpers';

const goalIncludes = [
  { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: Goal, as: 'parent', attributes: ['id', 'title'] },
  { model: KeyResult, as: 'keyResults', attributes: ['id', 'title', 'initialValue', 'currentValue', 'targetValue', 'unit', 'weight', 'status'] },
];

const goalDetailIncludes = [
  { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: Goal, as: 'parent', attributes: ['id', 'title'] },
  { model: Goal, as: 'children', attributes: ['id', 'title', 'status', 'progress', 'endDate'] },
  { model: KeyResult, as: 'keyResults' },
  { model: GoalCheckIn, as: 'checkIns', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }] },
];

const keyResultProgress = (kr: { initialValue: number; currentValue: number; targetValue: number }): number => {
  const span = kr.targetValue - kr.initialValue;
  if (span === 0) return kr.currentValue >= kr.targetValue ? 100 : 0;
  return clamp(round2(((kr.currentValue - kr.initialValue) / span) * 100), 0, 100);
};

export class GoalService extends CrudService {
  constructor() {
    super({
      model: Goal,
      moduleKey: 'goal',
      tenantScoped: true,
      searchFields: ['title', 'description'],
      filters: [
        { field: 'status', type: 'eq' },
        { field: 'alignmentType', type: 'eq' },
        { field: 'priority', type: 'eq' },
        { field: 'ownerId', type: 'eq' },
        { field: 'parentId', type: 'eq' },
      ],
      defaultSortBy: 'createdAt',
      include: goalIncludes,
      detailInclude: goalDetailIncludes,
      notFoundKey: 'goal.notFound',
      beforeCreate: async (data: Record<string, unknown>, req) => {
        const input = { ...data };
        input.createdById = req.user!.id;
        input.progress = 0;
        if (input.parentId) {
          await this.assertParentValid(Number(input.parentId), req);
        }
        return input;
      },
      beforeUpdate: async (data, _id, req) => {
        if (data.parentId) await this.assertParentValid(Number(data.parentId), req);
        if (data.status === 'completed') data.progress = 100;
        return data;
      },
    });
  }

  private async assertParentValid(parentId: number, req: Request): Promise<void> {
    const parent = await Goal.findOne({
      where: { ...this.scopeWhere(req), id: parentId },
      attributes: ['id'],
    });
    if (!parent) throw new ApiError(404, 'goal.notFound');
  }

  async recomputeProgress(goalId: number): Promise<Goal> {
    const goal = await Goal.findByPk(goalId);
    if (!goal) throw new ApiError(404, 'goal.notFound');
    const keyResults = await KeyResult.findAll({ where: { goalId }, attributes: ['currentValue', 'initialValue', 'targetValue', 'weight', 'status'] });
    if (keyResults.length === 0) {
      await goal.update({ progress: 0 });
      return goal;
    }
    let weighted = 0;
    let totalWeight = 0;
    for (const kr of keyResults) {
      weighted += keyResultProgress(kr) * kr.weight;
      totalWeight += kr.weight;
    }
    const progress = round2(totalWeight === 0 ? 0 : (weighted / totalWeight) * 100);
    await goal.update({ progress });
    return goal;
  }

  async createKeyResult(goalId: number, body: Record<string, unknown>, req: Request): Promise<KeyResult> {
    await this.findById(goalId, req);
    const kr = await KeyResult.create({
      goalId,
      title: body.title as string,
      description: (body.description as string | undefined) ?? null,
      initialValue: (body.initialValue as number | undefined) ?? 0,
      currentValue: (body.currentValue as number | undefined) ?? 0,
      targetValue: body.targetValue as number,
      unit: (body.unit as string | undefined) ?? null,
      weight: (body.weight as number | undefined) ?? 1,
      status: Number(body.currentValue) >= Number(body.targetValue) ? 'achieved' : 'not_started',
      sortOrder: (body.sortOrder as number | undefined) ?? 0,
    });
    if (kr.currentValue >= kr.targetValue) await kr.update({ status: 'achieved' });
    await this.recomputeProgress(goalId);
    return kr.reload();
  }

  async updateKeyResult(goalId: number, krId: number, body: Record<string, unknown>, req: Request): Promise<KeyResult> {
    await this.findById(goalId, req);
    const kr = await KeyResult.findOne({ where: { id: krId, goalId } });
    if (!kr) throw new ApiError(404, 'goal.keyResultNotFound');
    const patch: Record<string, unknown> = {};
    for (const field of ['title', 'description', 'initialValue', 'currentValue', 'targetValue', 'unit', 'weight', 'status', 'sortOrder'] as const) {
      if (body[field] !== undefined) patch[field] = body[field];
    }
    await kr.update(patch);
    const progress = keyResultProgress(kr);
    const status = progress >= 100 ? 'achieved' : progress > 0 || kr.currentValue > kr.initialValue ? 'on_track' : 'not_started';
    await kr.update({ status });
    await this.recomputeProgress(goalId);
    return kr.reload();
  }

  async removeKeyResult(goalId: number, krId: number, req: Request): Promise<{ id: number; deleted: true }> {
    await this.findById(goalId, req);
    const kr = await KeyResult.findOne({ where: { id: krId, goalId } });
    if (!kr) throw new ApiError(404, 'goal.keyResultNotFound');
    await kr.destroy();
    await this.recomputeProgress(goalId);
    return { id: krId, deleted: true };
  }

  async addCheckIn(
    goalId: number,
    body: { progress?: number; confidence?: number; note?: string; blockers?: string },
    req: Request,
  ): Promise<GoalCheckIn> {
    const goal = await this.findById(goalId, req);
    const checkIn = await GoalCheckIn.create({
      goalId,
      userId: req.user!.id,
      progress: body.progress ?? null,
      confidence: body.confidence ?? null,
      note: body.note ?? null,
      blockers: body.blockers ?? null,
    });
    if (body.progress !== undefined) {
      const progress = clamp(body.progress, 0, 100);
      await goal.update({ progress, ...(progress >= 100 ? { status: 'completed' } : {}) });
    }
    return checkIn;
  }

  async listByUser(userId: number, opts: { status?: string } = {}): Promise<Goal[]> {
    return Goal.findAll({
      where: { ownerId: userId, ...(opts.status ? { status: opts.status } : {}) },
      include: goalIncludes,
      order: [['createdAt', 'DESC']],
    });
  }
}

export const goalService = new GoalService();
export default goalService;