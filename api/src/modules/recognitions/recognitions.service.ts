import type { Request } from 'express';
import { Recognition, User } from '../../models';
import { CrudService } from '../../common/services/crud';
import { notifyUser } from '../../common/services/notification';

export class RecognitionService extends CrudService {
  constructor() {
    super({
      model: Recognition,
      moduleKey: 'recognition',
      tenantScoped: true,
      searchFields: ['message', 'badge'],
      filters: [{ field: 'visibility', type: 'eq' }],
      defaultSortBy: 'createdAt',
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      notFoundKey: 'recognition.notFound',
    });
  }

  async create(data: Record<string, unknown>, req: Request): Promise<any> {
    const recognition = await super.create({ ...data, senderId: req.user!.id }, req);
    await notifyUser({
      userId: recognition.receiverId ?? (data.receiverId as number),
      orgId: req.tenantId,
      type: 'recognition.received',
      title: 'You were recognized!',
      body: recognition.message ?? '',
      link: `/recognitions/${recognition.id}`,
      metadata: { recognitionId: recognition.id, points: recognition.points },
    });
    return recognition;
  }
}

export const recognitionService = new RecognitionService();
export default recognitionService;