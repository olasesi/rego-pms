import type { Request } from 'express';
import {
  CompensationBand,
  CompensationRecord,
  PayReviewCycle,
  PayReviewDecision,
  User,
} from '../../models';
import { CrudService } from '../../common/services/crud';
import { sequelize } from '../../config/database';
import { ApiError } from '../../common/utils/ApiError';
import { actorId, hasPermission, isAdmin, tenantScope } from '../../common/utils/access';

const userSummary = ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'title'];

export class CompensationBandService extends CrudService {
  constructor() {
    super({
      model: CompensationBand,
      moduleKey: 'compensationBand',
      tenantScoped: true,
      searchFields: ['name', 'level'],
      filters: [{ field: 'currency' }, { field: 'country' }, { field: 'level' }],
      defaultSortBy: 'name',
      notFoundKey: 'compensation.bandNotFound',
      validateCreate: (data) => {
        const min = Number(data.minSalary);
        const mid = Number(data.midSalary);
        const max = Number(data.maxSalary);
        if (min > mid || mid > max) throw new ApiError(400, 'compensation.invalidBand');
      },
      validateUpdate: (data, id, req) => {
        void id;
        void req;
        if (data.minSalary != null && data.midSalary != null && data.maxSalary != null) {
          const min = Number(data.minSalary);
          const mid = Number(data.midSalary);
          const max = Number(data.maxSalary);
          if (min > mid || mid > max) throw new ApiError(400, 'compensation.invalidBand');
        }
      },
    });
  }
}

export class CompensationRecordService extends CrudService {
  constructor() {
    super({
      model: CompensationRecord,
      moduleKey: 'compensationRecord',
      tenantScoped: true,
      filters: [
        { field: 'userId' },
        { field: 'type' },
        { field: 'currency' },
        { field: 'frequency' },
      ],
      include: [{ model: User, as: 'user', attributes: userSummary }],
      detailInclude: [
        { model: User, as: 'user', attributes: userSummary },
        { model: User, as: 'approvedBy', attributes: userSummary },
      ],
      defaultSortBy: 'effectiveDate',
      notFoundKey: 'compensation.recordNotFound',
      beforeCreate: (data) => ({ ...data, approvedById: data.approvedById ?? null }),
      canAccess: (record, req) => {
        if (isAdmin(req) || hasPermission(req, 'compensation:manage')) return true;
        return record.userId === req.user?.id;
      },
    });
  }

  protected scopeWhere(req: Request): Record<string, unknown> {
    const where = super.scopeWhere(req);
    if (!isAdmin(req) && !hasPermission(req, 'compensation:manage')) {
      where.userId = req.user?.id;
    }
    return where;
  }

  async mine(req: Request): Promise<any[]> {
    return CompensationRecord.findAll({
      where: { userId: actorId(req), ...tenantScope(req) },
      include: [{ model: User, as: 'approvedBy', attributes: userSummary }],
      order: [['effectiveDate', 'DESC']],
    });
  }

  /** Current total annual cash compensation for a user (or self). */
  async summary(userId: number, req: Request): Promise<Record<string, unknown>> {
    if (userId !== req.user?.id && !isAdmin(req) && !hasPermission(req, 'compensation:manage')) {
      throw new ApiError(403, 'auth.forbidden');
    }
    const records = await CompensationRecord.findAll({ where: { userId, ...tenantScope(req) } });
    const annual = records
      .filter((r) => r.type === 'salary')
      .map((r) => (r.frequency === 'monthly' ? r.amount * 12 : r.frequency === 'one_time' ? 0 : r.amount))
      .reduce((sum, v) => sum + v, 0);
    return {
      userId,
      annualSalary: Math.round(annual * 100) / 100,
      currency: records[0]?.currency ?? null,
      records: records.length,
    };
  }
}

export class PayReviewService extends CrudService {
  constructor() {
    super({
      model: PayReviewCycle,
      moduleKey: 'payReview',
      tenantScoped: true,
      searchFields: ['name'],
      filters: [{ field: 'status' }, { field: 'currency' }],
      include: [{ model: PayReviewDecision, as: 'decisions' }],
      detailInclude: [
        {
          model: PayReviewDecision,
          as: 'decisions',
          include: [{ model: User, as: 'user', attributes: userSummary }],
        },
      ],
      defaultSortBy: 'startDate',
      notFoundKey: 'compensation.payReviewNotFound',
    });
  }

  async addDecision(cycleId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    const cycle = await this.findById(cycleId, req);
    if (cycle.status === 'closed') throw new ApiError(400, 'compensation.cycleClosed');
    const existing = await PayReviewDecision.findOne({
      where: { cycleId, userId: Number(body.userId) },
    });
    if (existing) throw new ApiError(409, 'compensation.decisionExists');
    return PayReviewDecision.create({
      cycleId,
      userId: Number(body.userId),
      currentAmount: Number(body.currentAmount),
      proposedAmount: Number(body.proposedAmount),
      currency: (body.currency as string | undefined) ?? cycle.currency,
      reviewerId: actorId(req),
      note: body.note != null ? String(body.note) : null,
      status: 'pending',
    });
  }

  async updateDecision(
    cycleId: number,
    decisionId: number,
    body: Record<string, unknown>,
    req: Request,
  ): Promise<any> {
    await this.findById(cycleId, req);
    const decision = await PayReviewDecision.findOne({ where: { id: decisionId, cycleId } });
    if (!decision) throw new ApiError(404, 'compensation.decisionNotFound');
    if (decision.status === 'approved') throw new ApiError(400, 'compensation.decisionLocked');
    const data: Record<string, unknown> = {};
    if (body.proposedAmount != null) data.proposedAmount = Number(body.proposedAmount);
    if (body.currentAmount != null) data.currentAmount = Number(body.currentAmount);
    if (body.currency != null) data.currency = String(body.currency);
    if (body.note !== undefined) data.note = body.note != null ? String(body.note) : null;
    if (body.status != null) data.status = body.status;
    if (body.status === 'approved') data.reviewerId = actorId(req);
    await decision.update(data);
    return decision;
  }

  async approveDecision(cycleId: number, decisionId: number, req: Request): Promise<any> {
    const cycle = await this.findById(cycleId, req);
    if (cycle.status === 'closed') throw new ApiError(400, 'compensation.cycleClosed');
    return sequelize.transaction(async (transaction) => {
      const decision = await PayReviewDecision.findOne({
        where: { id: decisionId, cycleId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!decision) throw new ApiError(404, 'compensation.decisionNotFound');
      if (decision.status === 'approved') throw new ApiError(409, 'compensation.decisionLocked');

      await decision.update({ status: 'approved', reviewerId: actorId(req) }, { transaction });
      await CompensationRecord.create(
        {
          orgId: cycle.orgId,
          userId: decision.userId,
          type: 'salary',
          amount: decision.proposedAmount,
          currency: decision.currency,
          frequency: 'annual',
          effectiveDate: cycle.endDate,
          note: decision.note,
          approvedById: actorId(req),
        },
        { transaction },
      );
      return decision;
    });
  }

  async close(cycleId: number, req: Request): Promise<any> {
    const cycle = await this.findById(cycleId, req);
    const pending = await PayReviewDecision.count({ where: { cycleId, status: 'pending' } });
    if (pending > 0) throw new ApiError(400, 'compensation.pendingDecisions', { pending });
    await cycle.update({ status: 'closed' });
    return this.findById(cycleId, req);
  }

  async decisionSummary(cycleId: number, req: Request): Promise<Record<string, unknown>> {
    await this.findById(cycleId, req);
    const decisions = await PayReviewDecision.findAll({ where: { cycleId } });
    const approved = decisions.filter((d) => d.status === 'approved');
    const totalIncrease = approved.reduce((sum, d) => sum + (d.proposedAmount - d.currentAmount), 0);
    return {
      total: decisions.length,
      approved: approved.length,
      pending: decisions.filter((d) => d.status === 'pending').length,
      rejected: decisions.filter((d) => d.status === 'rejected').length,
      totalIncrease: Math.round(totalIncrease * 100) / 100,
      currency: decisions[0]?.currency ?? null,
    };
  }

  async myDecisions(req: Request): Promise<any[]> {
    return PayReviewDecision.findAll({
      where: { userId: actorId(req) },
      include: [
        {
          model: PayReviewCycle,
          as: 'cycle',
          where: { ...(req.tenantId != null ? { orgId: req.tenantId } : {}) },
          required: true,
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}

export const compensationBandService = new CompensationBandService();
export const compensationRecordService = new CompensationRecordService();
export const payReviewService = new PayReviewService();
