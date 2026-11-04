import type { Request } from 'express';
import { Op } from 'sequelize';
import { LeaveType, LeaveBalance, LeaveRequest, Holiday, User } from '../../models';
import { CrudService } from '../../common/services/crud';
import { sequelize } from '../../config/database';
import { ApiError } from '../../common/utils/ApiError';
import { actorId, hasPermission, isAdmin, tenantScope } from '../../common/utils/access';
import { round2 } from '../../common/utils/helpers';
import { queueWebhookEvent } from '../integrations/integrations.service';

const userSummary = ['id', 'firstName', 'lastName', 'email', 'avatarUrl'];

const requestIncludes = [
  { model: LeaveType, as: 'leaveType', attributes: ['id', 'name', 'code', 'color', 'isPaid'] },
  { model: User, as: 'user', attributes: userSummary },
  { model: User, as: 'approver', attributes: userSummary },
];

export class LeaveTypeService extends CrudService {
  constructor() {
    super({
      model: LeaveType,
      moduleKey: 'leaveType',
      tenantScoped: true,
      searchFields: ['name', 'code'],
      filters: [{ field: 'status' }, { field: 'isPaid', type: 'boolean' }],
      defaultSortBy: 'name',
      notFoundKey: 'timeOff.leaveTypeNotFound',
    });
  }
}

export class HolidayService extends CrudService {
  constructor() {
    super({
      model: Holiday,
      moduleKey: 'holiday',
      tenantScoped: true,
      searchFields: ['name', 'region'],
      filters: [{ field: 'region' }, { field: 'isRecurring', type: 'boolean' }, { field: 'date', type: 'date' }],
      defaultSortBy: 'date',
      notFoundKey: 'timeOff.holidayNotFound',
    });
  }
}

/** Count weekdays between two ISO dates (inclusive), excluding organisation holidays. */
const workingDays = async (orgId: number | null, startDate: string, endDate: string): Promise<number> => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiError(400, 'timeOff.invalidDates');
  if (start > end) throw new ApiError(400, 'timeOff.invalidRange');

  const holidays = await Holiday.findAll({
    where: { ...(orgId != null ? { orgId } : {}), date: { [Op.between]: [startDate, endDate] } },
    attributes: ['date', 'isRecurring'],
  });
  const recurring = await Holiday.findAll({
    where: { ...(orgId != null ? { orgId } : {}), isRecurring: true },
    attributes: ['date'],
  });
  const recurringKeys = new Set(recurring.map((h) => h.date.slice(5)));
  const holidayKeys = new Set(holidays.map((h) => h.date));

  let days = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !holidayKeys.has(iso) && !recurringKeys.has(iso.slice(5))) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

const yearOf = (date: string): number => Number(date.slice(0, 4));

export class TimeOffService {
  private assertCanApprove(req: Request): void {
    if (isAdmin(req) || hasPermission(req, 'time_off:approve') || hasPermission(req, 'time_off:manage')) return;
    throw new ApiError(403, 'auth.forbidden', undefined, 'FORBIDDEN');
  }

  private async getOrCreateBalance(
    orgId: number,
    userId: number,
    leaveType: LeaveType,
    year: number,
  ): Promise<LeaveBalance> {
    const [balance] = await LeaveBalance.findOrCreate({
      where: { userId, leaveTypeId: leaveType.id, year },
      defaults: {
        orgId,
        userId,
        leaveTypeId: leaveType.id,
        year,
        entitledDays: leaveType.defaultDays,
        usedDays: 0,
        carriedOverDays: 0,
      },
    });
    return balance;
  }

  async myBalances(req: Request): Promise<any[]> {
    const userId = actorId(req);
    const year = Number(req.query.year) || new Date().getFullYear();
    const types = await LeaveType.findAll({
      where: { ...tenantScope(req), status: 'active' },
      order: [['name', 'ASC']],
    });
    const orgId = req.tenantId;
    if (orgId == null) return [];
    const balances: any[] = [];
    for (const type of types) {
      const balance = await this.getOrCreateBalance(orgId, userId, type, year);
      balances.push({
        ...balance.toJSON(),
        remainingDays: round2(balance.entitledDays + balance.carriedOverDays - balance.usedDays),
        leaveType: type,
      });
    }
    return balances;
  }

  async balancesForUser(userId: number, req: Request): Promise<any[]> {
    if (req.user?.id !== userId) this.assertCanApprove(req);
    const year = Number(req.query.year) || new Date().getFullYear();
    const types = await LeaveType.findAll({ where: { ...tenantScope(req), status: 'active' } });
    const balances: any[] = [];
    for (const type of types) {
      const balance = await this.getOrCreateBalance(req.tenantId as number, userId, type, year);
      balances.push({
        ...balance.toJSON(),
        remainingDays: round2(balance.entitledDays + balance.carriedOverDays - balance.usedDays),
        leaveType: type,
      });
    }
    return balances;
  }

  async upsertBalance(body: Record<string, unknown>, req: Request): Promise<LeaveBalance> {
    const orgId = req.tenantId;
    if (orgId == null) throw new ApiError(400, 'common.invalidRequest');
    const leaveType = await LeaveType.findOne({ where: { id: Number(body.leaveTypeId), orgId } });
    if (!leaveType) throw new ApiError(404, 'timeOff.leaveTypeNotFound');
    const userId = Number(body.userId);
    const year = Number(body.year) || new Date().getFullYear();
    const [balance] = await LeaveBalance.findOrCreate({
      where: { userId, leaveTypeId: leaveType.id, year },
      defaults: {
        orgId,
        userId,
        leaveTypeId: leaveType.id,
        year,
        entitledDays: leaveType.defaultDays,
        usedDays: 0,
        carriedOverDays: 0,
      },
    });
    await balance.update({
      entitledDays: body.entitledDays != null ? Number(body.entitledDays) : balance.entitledDays,
      carriedOverDays: body.carriedOverDays != null ? Number(body.carriedOverDays) : balance.carriedOverDays,
      usedDays: body.usedDays != null ? Number(body.usedDays) : balance.usedDays,
    });
    return balance;
  }

  async myRequests(req: Request): Promise<any[]> {
    return LeaveRequest.findAll({
      where: { userId: actorId(req), ...tenantScope(req) },
      include: requestIncludes,
      order: [['createdAt', 'DESC']],
    });
  }

  async pending(req: Request): Promise<any[]> {
    this.assertCanApprove(req);
    return LeaveRequest.findAll({
      where: { status: 'pending', ...tenantScope(req) },
      include: requestIncludes,
      order: [['startDate', 'ASC']],
    });
  }

  async submit(body: Record<string, unknown>, req: Request): Promise<any> {
    const orgId = req.tenantId;
    if (orgId == null) throw new ApiError(400, 'common.invalidRequest');
    const userId = actorId(req);
    const leaveType = await LeaveType.findOne({ where: { id: Number(body.leaveTypeId), orgId } });
    if (!leaveType) throw new ApiError(404, 'timeOff.leaveTypeNotFound');

    const startDate = String(body.startDate);
    const endDate = String(body.endDate);
    const days = await workingDays(orgId, startDate, endDate);
    if (days <= 0) throw new ApiError(400, 'timeOff.noWorkingDays');

    const year = yearOf(startDate);
    const balance = await this.getOrCreateBalance(orgId, userId, leaveType, year);
    const remaining = balance.entitledDays + balance.carriedOverDays - balance.usedDays;
    if (leaveType.requiresApproval && remaining < days) throw new ApiError(400, 'timeOff.insufficientBalance');

    const request = await LeaveRequest.create({
      orgId,
      userId,
      leaveTypeId: leaveType.id,
      startDate,
      endDate,
      days,
      reason: body.reason != null ? String(body.reason) : null,
      status: leaveType.requiresApproval ? 'pending' : 'approved',
      approverId: leaveType.requiresApproval ? null : userId,
      decidedAt: leaveType.requiresApproval ? null : new Date(),
    });
    if (!leaveType.requiresApproval) {
      await balance.increment('usedDays', { by: days });
    }
    return LeaveRequest.findByPk(request.id, { include: requestIncludes });
  }

  async decide(id: number, decision: 'approved' | 'rejected', note: string | null, req: Request): Promise<any> {
    this.assertCanApprove(req);
    const orgId = req.tenantId;
    const approverId = actorId(req);
    await sequelize.transaction(async (transaction) => {
      const request = await LeaveRequest.findOne({
        where: { id, ...(orgId != null ? { orgId } : {}) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!request) throw new ApiError(404, 'timeOff.requestNotFound');
      if (request.status !== 'pending') throw new ApiError(400, 'timeOff.notPending');

      if (decision === 'approved') {
        const leaveType = await LeaveType.findByPk(request.leaveTypeId, { transaction });
        if (!leaveType) throw new ApiError(404, 'timeOff.leaveTypeNotFound');
        const balance = await this.getOrCreateBalance(request.orgId, request.userId, leaveType, yearOf(request.startDate));
        const remaining = balance.entitledDays + balance.carriedOverDays - balance.usedDays;
        if (remaining < request.days) throw new ApiError(400, 'timeOff.insufficientBalance');
        await LeaveBalance.increment('usedDays', {
          by: request.days,
          where: { id: balance.id },
          transaction,
        });
      }

      await request.update({ status: decision, approverId, decidedAt: new Date(), decisionNote: note }, { transaction });
    });
    const result = await LeaveRequest.findByPk(id, { include: requestIncludes });
    if (decision === 'approved' && result) {
      queueWebhookEvent(result.orgId, 'leave.approved', {
        requestId: result.id,
        userId: result.userId,
        startDate: result.startDate,
        endDate: result.endDate,
        days: result.days,
      });
    }
    return result;
  }

  async cancel(id: number, req: Request): Promise<any> {
    const orgId = req.tenantId;
    await sequelize.transaction(async (transaction) => {
      const request = await LeaveRequest.findOne({
        where: { id, ...(orgId != null ? { orgId } : {}) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!request) throw new ApiError(404, 'timeOff.requestNotFound');
      if (request.status === 'cancelled') return;
      const isOwner = request.userId === actorId(req);
      if (!isOwner && !isAdmin(req) && !hasPermission(req, 'time_off:manage')) {
        throw new ApiError(403, 'auth.forbidden');
      }
      if (request.status === 'approved') {
        const leaveType = await LeaveType.findByPk(request.leaveTypeId, { transaction });
        if (leaveType) {
          const balance = await LeaveBalance.findOne({
            where: {
              userId: request.userId,
              leaveTypeId: leaveType.id,
              year: yearOf(request.startDate),
            },
            transaction,
          });
          if (balance) {
            const nextUsed = Math.max(0, balance.usedDays - request.days);
            await balance.update({ usedDays: nextUsed }, { transaction });
          }
        }
      }
      await request.update({ status: 'cancelled', decidedAt: new Date() }, { transaction });
    });
    return LeaveRequest.findByPk(id, { include: requestIncludes });
  }

  async calendar(req: Request): Promise<any[]> {
    const from = (req.query.from as string | undefined) ?? new Date().toISOString().slice(0, 10);
    const to = (req.query.to as string | undefined) ?? from;
    return LeaveRequest.findAll({
      where: {
        ...tenantScope(req),
        status: 'approved',
        startDate: { [Op.lte]: to },
        endDate: { [Op.gte]: from },
      },
      include: requestIncludes,
      order: [['startDate', 'ASC']],
    });
  }
}

export const leaveTypeService = new LeaveTypeService();
export const holidayService = new HolidayService();
export const timeOffService = new TimeOffService();
