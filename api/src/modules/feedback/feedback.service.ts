import type { Request } from 'express';
import { Feedback, User } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { notifyUser } from '../../common/services/notification';

export class FeedbackService extends CrudService {
  constructor() {
    super({
      model: Feedback,
      moduleKey: 'feedback',
      tenantScoped: true,
      searchFields: ['title', 'message'],
      filters: [
        { field: 'type', type: 'eq' },
        { field: 'visibility', type: 'eq' },
      ],
      defaultSortBy: 'createdAt',
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      notFoundKey: 'feedback.notFound',
      validateCreate: async (data, req) => {
        if (Number(data.receiverId) === req.user!.id) throw new ApiError(400, 'feedback.cannotFeedbackSelf');
        data.senderId = req.user!.id;
      },
    });
  }

  async create(data: Record<string, unknown>, req: Request): Promise<any> {
    if (Number(data.receiverId) === req.user!.id) throw new ApiError(400, 'feedback.cannotFeedbackSelf');
    const feedback = await super.create({ ...data, senderId: req.user!.id }, req);
    await notifyUser({
      userId: feedback.receiverId ?? data.receiverId as number,
      orgId: req.tenantId,
      type: 'feedback.received',
      title: 'New feedback received',
      body: `You received ${feedback.type} feedback`,
      link: `/feedback/${feedback.id}`,
      metadata: { feedbackId: feedback.id },
    });
    return feedback;
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;