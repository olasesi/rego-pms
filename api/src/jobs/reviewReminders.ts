import { Op } from 'sequelize';
import { PerformanceReview, ReviewParticipant, ReviewCycle } from '../models';
import { notifyUser } from '../common/services/notification';

interface ParticipantView {
  id: number;
  reviewerId: number;
  role: string;
  status: string;
}

interface ReviewView {
  id: number;
  orgId: number;
  userId: number;
  participants: ParticipantView[];
}

export async function runReviewReminders(): Promise<void> {
  const cycles = await ReviewCycle.findAll({ where: { status: 'active' }, attributes: ['id'] });
  if (cycles.length === 0) return;

  for (const cycle of cycles) {
    const reviews = (await PerformanceReview.findAll({
      where: {
        cycleId: cycle.id,
        status: { [Op.notIn]: ['approved', 'signed_off'] },
      },
      attributes: ['id', 'orgId', 'userId'],
      include: [
        {
          model: ReviewParticipant,
          as: 'participants',
          attributes: ['id', 'reviewerId', 'role', 'status'],
          where: { status: 'pending' },
          required: false,
        },
      ],
      limit: 200,
    })) as unknown as ReviewView[];

    for (const review of reviews) {
      for (const participant of review.participants ?? []) {
        await notifyUser({
          userId: participant.reviewerId,
          orgId: review.orgId,
          type: 'review.reminder',
          title: 'Pending performance review',
          body: `You have a pending ${participant.role.toLowerCase()} assessment. Please complete it before the cycle ends.`,
          link: `/reviews/${review.id}`,
          metadata: { reviewId: review.id, role: participant.role },
        });
      }
    }
  }
}