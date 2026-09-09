/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request } from 'express';
import { Op } from 'sequelize';
import {
  PerformanceReview,
  ReviewCycle,
  ReviewTemplate,
  ReviewQuestion,
  ReviewParticipant,
  ReviewResponse,
  User,
} from '../../models';
import { ApiError } from '../../common/utils/ApiError';
import { notifyUser } from '../../common/services/notification';
import { round2 } from '../../common/utils/helpers';

const reviewIncludes = [
  { model: User, as: 'reviewee', attributes: ['id', 'firstName', 'lastName', 'email', 'title'] },
  { model: ReviewCycle, as: 'cycle', attributes: ['id', 'name', 'period', 'startDate', 'endDate', 'status'] },
  { model: ReviewTemplate, as: 'template', attributes: ['id', 'name'] },
];

const reviewDetailIncludes = [
  ...reviewIncludes,
  {
    model: ReviewParticipant,
    as: 'participants',
    include: [{ model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName', 'email'] }],
  },
];

const REVIEW_STATUS_ORDER: Record<string, number> = {
  draft: 0,
  in_progress: 1,
  self_completed: 2,
  peer_reviewed: 3,
  manager_reviewed: 4,
  approved: 5,
  signed_off: 6,
  needs_improvement: 7,
};

export class ReviewService {
  async list(req: Request): Promise<{ rows: PerformanceReview[]; meta: { page: number; limit: number; total: number; pages: number } }> {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 25));
    const where: any = { ...(req.tenantId != null ? { orgId: req.tenantId } : {}) };
    if (req.user && !req.user.roles.includes('super_admin') && !req.user.permissions.includes('reviews:manage') && !req.user.permissions.includes('reviews:assess')) {
      where.userId = req.user.id;
    } else if (req.query.userId) {
      where.userId = Number(req.query.userId);
    }
    if (req.query.cycleId) where.cycleId = Number(req.query.cycleId);
    if (req.query.status) where.status = req.query.status;

    const { rows, count } = await PerformanceReview.findAndCountAll({
      where,
      include: reviewIncludes,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });
    return { rows, meta: { page, limit, total: count, pages: Math.ceil(count / limit) } };
  }

  async findById(id: number, req: Request): Promise<any> {
    const review = await PerformanceReview.findByPk(id, { include: reviewDetailIncludes });
    if (!review) throw new ApiError(404, 'review.notFound');
    if (req.tenantId != null && review.orgId !== req.tenantId) throw new ApiError(403, 'auth.forbidden');
    return review;
  }

  async createForUser(cycleId: number, userId: number, req: Request): Promise<PerformanceReview> {
    const cycle = await ReviewCycle.findOne({ where: { id: cycleId, orgId: req.tenantId as number } });
    if (!cycle) throw new ApiError(404, 'cycle.notFound');
    const template = await ReviewTemplate.findOne({ where: { orgId: req.tenantId as number, status: 'active' }, order: [['isDefault', 'DESC']] });
    if (!template) throw new ApiError(400, 'template.notFound');

    const [review] = await PerformanceReview.findOrCreate({
      where: { orgId: req.tenantId as number, cycleId, userId },
      defaults: { orgId: req.tenantId as number, cycleId, userId, templateId: template.id, status: 'draft' },
    });
    if (review.status === 'draft') {
      await this.seedSelfParticipant(review.id, userId);
    }
    return review.reload({ include: reviewDetailIncludes });
  }

  private async seedSelfParticipant(reviewId: number, userId: number): Promise<void> {
    const count = await ReviewParticipant.count({ where: { reviewId, role: 'self' } });
    if (count === 0) {
      await ReviewParticipant.create({ reviewId, reviewerId: userId, role: 'self', status: 'pending' });
    }
  }

  async bulkCreate(cycleId: number, userIds: number[], req: Request): Promise<PerformanceReview[]> {
    const created: PerformanceReview[] = [];
    for (const userId of userIds) {
      created.push(await this.createForUser(cycleId, userId, req));
    }
    return created;
  }

  async addParticipant(reviewId: number, body: { reviewerId: number; role: ReviewParticipant['role']; isAnonymous?: boolean }, req: Request): Promise<ReviewParticipant> {
    const review = await this.findById(reviewId, req);
    const existing = await ReviewParticipant.findOne({
      where: { reviewId, reviewerId: body.reviewerId, role: body.role },
    });
    if (existing) throw new ApiError(409, 'review.alreadyParticipant');
    const participant = await ReviewParticipant.create({
      reviewId,
      reviewerId: body.reviewerId,
      role: body.role,
      isAnonymous: body.isAnonymous ?? false,
      status: 'pending',
    });
    await notifyUser({
      userId: body.reviewerId,
      orgId: review.orgId,
      type: 'review.assigned',
      title: 'Performance review requested',
      body: `You have been asked to provide a ${body.role} assessment.`,
      link: `/reviews/${reviewId}`,
    });
    return participant.reload({ include: [{ model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName', 'email'] }] });
  }

  async removeParticipant(reviewId: number, participantId: number, req: Request): Promise<{ id: number; deleted: true }> {
    await this.findById(reviewId, req);
    await ReviewParticipant.destroy({ where: { id: participantId, reviewId } });
    await ReviewResponse.destroy({ where: { reviewId, respondentId: participantId } });
    return { id: participantId, deleted: true };
  }

  async myPending(reviewId: number, req: Request): Promise<{ review: any; questions: ReviewQuestion[]; myResponses: any[]; source: string }> {
    const review = await this.findById(reviewId, req);
    const participant = await ReviewParticipant.findOne({
      where: { reviewId, reviewerId: req.user!.id, role: { [Op.ne]: 'self' } },
    });
    const source: any = participant?.role ?? 'self';
    const questions = await ReviewQuestion.findAll({ where: { templateId: review.templateId }, order: [['sortOrder', 'ASC']] });
    const myResponses = await ReviewResponse.findAll({
      where: { reviewId, respondentId: req.user!.id },
    });
    return { review, questions, myResponses, source };
  }

  async submitAssessment(
    reviewId: number,
    body: { answers: Array<{ questionId: number; rating?: number; answer?: string }>; comments?: string },
    req: Request,
  ): Promise<{ success: true }> {
    const review = await this.findById(reviewId, req);
    const questions = await ReviewQuestion.findAll({ where: { templateId: review.templateId }, attributes: ['id', 'required', 'type'] });
    const questionIds = new Set(questions.map((q) => q.id));
    const byQuestion = new Map<number, { rating?: number; answer?: string }>();
    for (const answer of body.answers) {
      if (!questionIds.has(answer.questionId)) continue;
      byQuestion.set(answer.questionId, answer);
    }
    const unanswered = questions.some((q) => q.required && !byQuestion.has(q.id));
    if (unanswered) {
      throw new ApiError(400, 'validation.failed', { missingRequired: 'All required questions must be answered' });
    }

    const isSelf = req.user!.id === review.userId;
    const source: any = isSelf ? 'self' : 'manager';
    const participant = await ReviewParticipant.findOne({ where: { reviewId, reviewerId: req.user!.id, role: { [Op.ne]: 'self' } } });
    const roleSource = participant?.role ?? 'self';

    for (const [questionId, value] of byQuestion) {
      const [response] = await ReviewResponse.findOrCreate({
        where: { reviewId, questionId, respondentId: req.user!.id },
        defaults: {
          reviewId,
          questionId,
          source: roleSource,
          respondentId: req.user!.id,
          rating: value.rating ?? null,
          answer: value.answer ?? null,
        },
      });
      if (response) {
        await response.update({ rating: value.rating ?? null, answer: value.answer ?? null });
      }
    }

    if (participant) {
      await participant.update({ status: 'submitted', submittedAt: new Date() });
      await notifyUser({
        userId: review.userId,
        orgId: review.orgId,
        type: 'review.submitted',
        title: 'A reviewer completed their assessment',
        body: `Your ${roleSource} assessment has a new completed review.`,
        link: `/reviews/${reviewId}`,
      });
    }

    void isSelf;
    void source;

    if (isSelf) {
      await review.update({ status: 'self_completed', selfComments: body.comments ?? null });
    } else if (roleSource === 'manager') {
      await review.update({ status: 'manager_reviewed', managerComments: body.comments ?? null });
      await this.recomputeConsolidated(review);
    } else {
      if (review.status === 'draft' || review.status === 'in_progress') await review.update({ status: 'peer_reviewed' });
      await this.recomputeConsolidated(review);
    }
    await this.recomputeConsolidated(review);
    return { success: true };
  }

  async recomputeConsolidated(review: PerformanceReview): Promise<void> {
    const questions = await ReviewQuestion.findAll({
      where: { templateId: review.templateId, type: 'rating' },
      attributes: ['id', 'weight'],
    });
    const responses = await ReviewResponse.findAll({
      where: { reviewId: review.id, rating: { [Op.ne]: null } },
      attributes: ['questionId', 'rating', 'source'],
    });
    if (questions.length === 0 || responses.length === 0) return;

    let total = 0;
    let weights = 0;
    for (const question of questions) {
      const forQuestion = responses.filter((r) => r.questionId === question.id);
      if (forQuestion.length === 0) continue;
      const sourceWeights: Record<string, number> = { self: 0.2, manager: 0.5, peer: 0.2, subordinate: 0.1, customer: 0.1 };
      let weightedAvg = 0;
      let wSum = 0;
      for (const r of forQuestion) {
        const w = sourceWeights[r.source] ?? 0.2;
        weightedAvg += (r.rating ?? 0) * w;
        wSum += w;
      }
      if (wSum === 0) continue;
      total += (weightedAvg / wSum) * question.weight;
      weights += question.weight;
    }
    const score = round2(weights === 0 ? 0 : total / weights);
    await review.update({ consolidatedScore: score, overallRating: score });
  }

  async approve(reviewId: number, req: Request): Promise<PerformanceReview> {
    const review = await this.findById(reviewId, req);
    await review.update({ status: 'approved', approvedById: req.user!.id, approvedAt: new Date() });
    this.recomputeConsolidated(review);
    return this.findById(reviewId, req);
  }

  async signOff(reviewId: number, req: Request): Promise<PerformanceReview> {
    const review = await this.findById(reviewId, req);
    await review.update({ status: 'signed_off', signedOffById: req.user!.id, signedOffAt: new Date() });
    return this.findById(reviewId, req);
  }

  async changeStatus(reviewId: number, status: PerformanceReview['status'], req: Request): Promise<PerformanceReview> {
    const review = await this.findById(reviewId, req);
    const current = REVIEW_STATUS_ORDER[review.status] ?? 0;
    const target = REVIEW_STATUS_ORDER[status] ?? 0;
    if (target < current) {
      throw new ApiError(400, 'review.statusChanged', { note: 'Cannot move a review to an earlier status' });
    }
    await review.update({ status });
    return this.findById(reviewId, req);
  }

  async remove(reviewId: number, req: Request): Promise<{ id: number; deleted: true }> {
    await this.findById(reviewId, req);
    await PerformanceReview.destroy({ where: { id: reviewId } });
    return { id: reviewId, deleted: true };
  }
}

export const reviewService = new ReviewService();
export default reviewService;