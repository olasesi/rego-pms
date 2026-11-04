import type { Request } from 'express';
import { CalibrationSession, CalibrationParticipant, User, ReviewCycle } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { round2 } from '../../common/utils/helpers';

const userSummary = ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'title'];

const participantIncludes = [
  { model: User, as: 'user', attributes: userSummary },
  { model: User, as: 'manager', attributes: userSummary },
];

const sessionIncludes = [
  { model: ReviewCycle, as: 'cycle', attributes: ['id', 'name', 'status'] },
  { model: User, as: 'facilitator', attributes: userSummary },
  {
    model: CalibrationParticipant,
    as: 'participants',
    include: participantIncludes,
  },
];

const NINE_BOXES = [
  'low_impact',
  'moderate_impact',
  'high_impact',
  'inconsistent',
  'core',
  'high_performer',
  'risk',
  'high_potential',
  'star',
] as const;

type NineBox = (typeof NINE_BOXES)[number];

const band = (rating: number | null): 'low' | 'moderate' | 'high' => {
  if (rating == null) return 'moderate';
  if (rating <= 2) return 'low';
  if (rating <= 3.5) return 'moderate';
  return 'high';
};

/** Map performance × potential onto the canonical 9-box. */
export const computeBox = (performance: number | null, potential: number | null): NineBox => {
  const p = band(performance);
  const q = band(potential);
  const map: Record<string, Record<string, NineBox>> = {
    low: { low: 'low_impact', moderate: 'inconsistent', high: 'high_potential' },
    moderate: { low: 'moderate_impact', moderate: 'core', high: 'risk' },
    high: { low: 'high_impact', moderate: 'high_performer', high: 'star' },
  };
  return map[p][q];
};

export class CalibrationService extends CrudService {
  constructor() {
    super({
      model: CalibrationSession,
      moduleKey: 'calibration',
      tenantScoped: true,
      searchFields: ['name'],
      filters: [{ field: 'status' }, { field: 'cycleId' }],
      include: sessionIncludes,
      detailInclude: sessionIncludes,
      defaultSortBy: 'createdAt',
      notFoundKey: 'calibration.sessionNotFound',
      validateUpdate: async (data, id, req) => {
        if (data.status === 'completed') {
          const session = await this.findById(id, req);
          if (session.status === 'completed') throw new ApiError(400, 'calibration.alreadyCompleted');
        }
      },
    });
  }

  async addParticipant(sessionId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    const session = await this.findById(sessionId, req);
    if (session.status === 'completed') throw new ApiError(400, 'calibration.sessionLocked');
    const existing = await CalibrationParticipant.findOne({
      where: { sessionId, userId: Number(body.userId) },
    });
    if (existing) throw new ApiError(409, 'calibration.participantExists');
    const performanceRating = body.performanceRating != null ? Number(body.performanceRating) : null;
    const potentialRating = body.potentialRating != null ? Number(body.potentialRating) : null;
    const box = (body.box as NineBox | undefined) ?? computeBox(performanceRating, potentialRating);
    return CalibrationParticipant.create({
      sessionId,
      userId: Number(body.userId),
      managerId: body.managerId != null ? Number(body.managerId) : null,
      performanceRating,
      potentialRating,
      box,
      proposedRating: body.proposedRating != null ? Number(body.proposedRating) : null,
      finalRating: body.finalRating != null ? Number(body.finalRating) : null,
      notes: body.notes != null ? String(body.notes) : null,
    });
  }

  async updateParticipant(
    sessionId: number,
    participantId: number,
    body: Record<string, unknown>,
    req: Request,
  ): Promise<any> {
    const session = await this.findById(sessionId, req);
    const participant = await CalibrationParticipant.findOne({
      where: { id: participantId, sessionId },
    });
    if (!participant) throw new ApiError(404, 'calibration.participantNotFound');
    if (session.status === 'completed' && body.finalRating !== undefined) {
      throw new ApiError(400, 'calibration.finalRatingLocked');
    }
    const performanceRating =
      body.performanceRating !== undefined ? (body.performanceRating as number | null) : participant.performanceRating;
    const potentialRating =
      body.potentialRating !== undefined ? (body.potentialRating as number | null) : participant.potentialRating;
    const data: Record<string, unknown> = { ...body };
    if (body.box === undefined) data.box = computeBox(performanceRating, potentialRating);
    await participant.update(data);
    return CalibrationParticipant.findByPk(participantId, { include: participantIncludes });
  }

  async removeParticipant(sessionId: number, participantId: number, req: Request): Promise<void> {
    const session = await this.findById(sessionId, req);
    if (session.status === 'completed') throw new ApiError(400, 'calibration.sessionLocked');
    const participant = await CalibrationParticipant.findOne({ where: { id: participantId, sessionId } });
    if (!participant) throw new ApiError(404, 'calibration.participantNotFound');
    await participant.destroy();
  }

  async matrix(sessionId: number, req: Request): Promise<Record<string, unknown>> {
    const session = await this.findById(sessionId, req);
    const participants: any[] = session.participants ?? [];
    const distribution: Record<string, number> = Object.fromEntries(NINE_BOXES.map((box) => [box, 0]));
    const ratingDistribution: Record<string, number> = {};
    for (const participant of participants) {
      if (participant.box) distribution[participant.box] = (distribution[participant.box] ?? 0) + 1;
      if (participant.finalRating != null) {
        const key = String(participant.finalRating);
        ratingDistribution[key] = (ratingDistribution[key] ?? 0) + 1;
      }
    }
    const performances = participants.map((p) => p.performanceRating).filter((v): v is number => v != null);
    const potentials = participants.map((p) => p.potentialRating).filter((v): v is number => v != null);
    const avg = (values: number[]): number | null =>
      values.length ? round2(values.reduce((sum, v) => sum + v, 0) / values.length) : null;

    return {
      session: { id: session.id, name: session.name, status: session.status },
      participants: participants.length,
      distribution,
      ratingDistribution,
      averagePerformance: avg(performances),
      averagePotential: avg(potentials),
      grid: NINE_BOXES.map((box) => ({
        box,
        count: distribution[box] ?? 0,
        employees: participants
          .filter((p) => p.box === box)
          .map((p) => ({ participantId: p.id, id: p.user?.id, name: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') })),
      })),
    };
  }

  async complete(sessionId: number, req: Request): Promise<any> {
    const session = await this.findById(sessionId, req);
    if (session.status === 'completed') return session;
    const missing = (session.participants ?? []).filter((p: any) => p.finalRating == null).length;
    if (missing > 0) throw new ApiError(400, 'calibration.missingFinalRatings', { missing });
    await session.update({ status: 'completed' });
    return this.findById(sessionId, req);
  }
}

export const calibrationService = new CalibrationService();
