import { Op } from 'sequelize';
import { Goal, GoalCheckIn } from '../models';
import { notifyUser } from '../common/services/notification';

interface GoalView {
  id: number;
  orgId: number;
  ownerId: number | null;
  title: string;
}

export async function runGoalDigest(): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const goals = (await Goal.findAll({
    where: {
      status: 'active',
      updatedAt: { [Op.lt]: sevenDaysAgo },
      ownerId: { [Op.ne]: null },
    },
    attributes: ['id', 'orgId', 'ownerId', 'title'],
    include: [
      {
        model: GoalCheckIn,
        as: 'checkIns',
        attributes: ['id'],
        where: { createdAt: { [Op.gte]: sevenDaysAgo } },
        required: false,
      },
    ],
    limit: 200,
  })) as unknown as Array<GoalView & { checkIns: { id: number }[] }>;

  for (const goal of goals) {
    if ((goal.checkIns ?? []).length > 0) continue;
    if (goal.ownerId == null) continue;
    await notifyUser({
      userId: goal.ownerId,
      orgId: goal.orgId,
      type: 'goal.checkin',
      title: 'Goal needs a check-in',
      body: `"${goal.title}" has not received a check-in in over a week.`,
      link: `/goals/${goal.id}`,
      metadata: { goalId: goal.id },
    });
  }
}