import type { Request } from 'express';
import { Op } from 'sequelize';
import { OneOnOneSeries, OneOnOneMeeting, OneOnOneAgendaItem, User } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { actorId, hasPermission, isAdmin } from '../../common/utils/access';

const userSummary = ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'title'];

const seriesIncludes = [
  { model: User, as: 'manager', attributes: userSummary },
  { model: User, as: 'employee', attributes: userSummary },
];

const seriesDetailIncludes = [
  ...seriesIncludes,
  {
    model: OneOnOneMeeting,
    as: 'meetings',
    separate: true,
    order: [['scheduledAt', 'DESC']] as [string, string][],
    limit: 50,
    include: [{ model: OneOnOneAgendaItem, as: 'agendaItems' }],
  },
];

const meetingIncludes = [
  {
    model: OneOnOneSeries,
    as: 'series',
    include: seriesIncludes,
  },
  { model: OneOnOneAgendaItem, as: 'agendaItems' },
];

export class OneOnOneService extends CrudService {
  constructor() {
    super({
      model: OneOnOneSeries,
      moduleKey: 'oneOnOne',
      tenantScoped: true,
      searchFields: ['title'],
      filters: [{ field: 'status' }, { field: 'cadence' }, { field: 'managerId' }, { field: 'employeeId' }],
      include: seriesIncludes,
      detailInclude: seriesDetailIncludes,
      defaultSortBy: 'updatedAt',
      notFoundKey: 'oneOnOne.notFound',
      beforeCreate: (data, req) => ({ ...data, createdById: actorId(req) }),
      canAccess: (record, req) => {
        if (isAdmin(req) || hasPermission(req, 'one_on_ones:manage')) return true;
        const id = req.user?.id;
        return record.managerId === id || record.employeeId === id;
      },
    });
  }

  /** Series where the caller is manager or employee. */
  async mine(req: Request): Promise<any[]> {
    const id = actorId(req);
    const scope: Record<string, unknown> = { [Op.or]: [{ managerId: id }, { employeeId: id }] };
    if (req.tenantId != null) scope.orgId = req.tenantId;
    return OneOnOneSeries.findAll({
      where: scope,
      include: seriesDetailIncludes,
      order: [['updatedAt', 'DESC']],
    });
  }

  private async loadSeries(id: number, req: Request): Promise<any> {
    return this.findById(id, req);
  }

  private async loadMeeting(id: number, req: Request): Promise<any> {
    const meeting = await OneOnOneMeeting.findByPk(id, { include: meetingIncludes });
    if (!meeting) throw new ApiError(404, 'oneOnOne.meetingNotFound');
    await this.loadSeries(meeting.seriesId, req);
    return meeting;
  }

  async listMeetings(seriesId: number, req: Request): Promise<any[]> {
    await this.loadSeries(seriesId, req);
    return OneOnOneMeeting.findAll({
      where: { seriesId },
      include: [{ model: OneOnOneAgendaItem, as: 'agendaItems' }],
      order: [['scheduledAt', 'DESC']],
    });
  }

  async createMeeting(seriesId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    const series = await this.loadSeries(seriesId, req);
    const meeting = await OneOnOneMeeting.create({ ...body, seriesId } as any);
    await series.update({ nextMeetingAt: (body.scheduledAt as string | undefined) ?? series.nextMeetingAt });
    return this.loadMeeting(meeting.id, req);
  }

  async updateMeeting(meetingId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    const meeting = await this.loadMeeting(meetingId, req);
    if (meeting.status === 'completed' && body.status !== undefined) {
      // allow adding notes to completed meetings, but not re-opening silently
    }
    const data = { ...body };
    if (data.status === 'completed' && !data.completedAt) data.completedAt = new Date();
    await meeting.update(data);
    return this.loadMeeting(meetingId, req);
  }

  async removeMeeting(meetingId: number, req: Request): Promise<void> {
    const meeting = await this.loadMeeting(meetingId, req);
    await meeting.destroy();
  }

  async addAgendaItem(meetingId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    const meeting = await this.loadMeeting(meetingId, req);
    const item = await OneOnOneAgendaItem.create({
      ...body,
      meetingId: meeting.id,
      createdById: actorId(req),
    } as any);
    return item;
  }

  private async loadAgendaItem(itemId: number, req: Request): Promise<any> {
    const item = await OneOnOneAgendaItem.findByPk(itemId, {
      include: [{ model: OneOnOneMeeting, as: 'meeting' }],
    });
    if (!item) throw new ApiError(404, 'oneOnOne.agendaItemNotFound');
    const series = await this.loadSeries((item as any).meeting.seriesId, req);
    if (item.isPrivate) {
      const id = req.user?.id;
      const visible = item.createdById === id || series.managerId === id;
      if (!visible && !isAdmin(req) && !hasPermission(req, 'one_on_ones:manage')) {
        throw new ApiError(403, 'auth.forbidden');
      }
    }
    return item;
  }

  async updateAgendaItem(itemId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    const item = await this.loadAgendaItem(itemId, req);
    await item.update(body);
    return item;
  }

  async removeAgendaItem(itemId: number, req: Request): Promise<void> {
    const item = await this.loadAgendaItem(itemId, req);
    await item.destroy();
  }

  /** Upcoming meetings across the caller's series. */
  async upcoming(req: Request): Promise<any[]> {
    const id = actorId(req);
    const series = await OneOnOneSeries.findAll({
      where: {
        ...(req.tenantId != null ? { orgId: req.tenantId } : {}),
        [Op.or]: [{ managerId: id }, { employeeId: id }],
      },
      attributes: ['id'],
    });
    const ids = series.map((s) => s.id);
    if (ids.length === 0) return [];
    return OneOnOneMeeting.findAll({
      where: { seriesId: { [Op.in]: ids }, scheduledAt: { [Op.gte]: new Date() }, status: 'scheduled' },
      include: meetingIncludes,
      order: [['scheduledAt', 'ASC']],
      limit: 25,
    });
  }
}

export const oneOnOneService = new OneOnOneService();
export default oneOnOneService;
