import type { Request } from 'express';
import { Notification } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { buildOrder, getPagination, paginateMeta } from '../../common/utils/query';

export class NotificationService extends CrudService {
  constructor() {
    super({
      model: Notification,
      moduleKey: 'notification',
      defaultSortBy: 'createdAt',
      notFoundKey: 'notification.notFound',
    });
  }

  async mine(req: Request): Promise<{ rows: Notification[]; meta: any; unread: number }> {
    const scope = req.tenantId != null ? { orgId: req.tenantId } : {};
    const { page, limit, offset } = getPagination(req.query);
    const order = buildOrder(req, { defaultSortBy: 'createdAt' });
    const unread = await Notification.count({ where: { ...scope, userId: req.user!.id, readAt: null } });
    const { rows, count } = await Notification.findAndCountAll({
      where: { ...scope, userId: req.user!.id },
      order,
      limit,
      offset,
    });
    return { rows, meta: paginateMeta(page, limit, count), unread };
  }

  async markRead(id: number, req: Request): Promise<Notification> {
    const notification = await Notification.findOne({ where: { id, userId: req.user!.id } });
    if (!notification) throw new ApiError(404, 'notification.notFound');
    await notification.update({ readAt: new Date() });
    return notification;
  }

  async markAllRead(req: Request): Promise<{ updated: number }> {
    const [updated] = await Notification.update(
      { readAt: new Date() },
      { where: { userId: req.user!.id, readAt: null } },
    );
    return { updated };
  }
}

export const notificationService = new NotificationService();
export default notificationService;