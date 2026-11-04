import type { Request } from 'express';
import { Op } from 'sequelize';
import { Survey, SurveyQuestion, SurveyResponse, SurveyAnswer, User, Department } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { actorId, tenantScope } from '../../common/utils/access';
import { round2 } from '../../common/utils/helpers';
import { queueWebhookEvent } from '../integrations/integrations.service';

const surveyIncludes = [
  { model: SurveyQuestion, as: 'questions', separate: true, order: [['sortOrder', 'ASC']] as [string, string][] },
];

export interface SurveyAnalytics {
  survey: { id: number; title: string; type: string; status: string; isAnonymous: boolean };
  responses: number;
  audience: number;
  participationRate: number;
  enps: number | null;
  questions: Array<{
    questionId: number;
    title: string;
    type: string;
    responseCount: number;
    average: number | null;
    distribution: Record<string, number>;
  }>;
  byDepartment: Array<{ departmentId: number | null; departmentName: string | null; responses: number; average: number | null }>;
}

export class SurveyService extends CrudService {
  constructor() {
    super({
      model: Survey,
      moduleKey: 'survey',
      tenantScoped: true,
      searchFields: ['title', 'description'],
      filters: [{ field: 'status' }, { field: 'type' }, { field: 'isAnonymous', type: 'boolean' }],
      include: surveyIncludes,
      detailInclude: surveyIncludes,
      defaultSortBy: 'createdAt',
      notFoundKey: 'survey.notFound',
      beforeCreate: (data, req) => ({ ...data, createdById: actorId(req) }),
    });
  }

  /** Active surveys the caller has not yet completed. */
  async available(req: Request): Promise<any[]> {
    const id = actorId(req);
    const surveys = await Survey.findAll({
      where: {
        ...tenantScope(req),
        status: 'active',
        [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: new Date() } }],
      },
      include: surveyIncludes,
      order: [['createdAt', 'DESC']],
    });
    const responses = await SurveyResponse.findAll({
      where: { surveyId: { [Op.in]: surveys.map((s) => s.id) }, userId: id },
      attributes: ['surveyId'],
    });
    const answered = new Set(responses.map((r) => r.surveyId));
    return surveys.filter((s) => !answered.has(s.id));
  }

  private async loadSurvey(id: number, req: Request): Promise<any> {
    return this.findById(id, req);
  }

  async addQuestion(surveyId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    await this.loadSurvey(surveyId, req);
    return SurveyQuestion.create({ ...body, surveyId } as any);
  }

  async updateQuestion(surveyId: number, questionId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    await this.loadSurvey(surveyId, req);
    const question = await SurveyQuestion.findOne({ where: { id: questionId, surveyId } });
    if (!question) throw new ApiError(404, 'survey.questionNotFound');
    await question.update(body);
    return question;
  }

  async removeQuestion(surveyId: number, questionId: number, req: Request): Promise<void> {
    await this.loadSurvey(surveyId, req);
    const question = await SurveyQuestion.findOne({ where: { id: questionId, surveyId } });
    if (!question) throw new ApiError(404, 'survey.questionNotFound');
    await question.destroy();
  }

  async launch(surveyId: number, req: Request): Promise<any> {
    const survey = await this.loadSurvey(surveyId, req);
    if (survey.questions.length === 0) throw new ApiError(400, 'survey.noQuestions');
    await survey.update({ status: 'active', startDate: survey.startDate ?? new Date() });
    return this.loadSurvey(surveyId, req);
  }

  async close(surveyId: number, req: Request): Promise<any> {
    const survey = await this.loadSurvey(surveyId, req);
    await survey.update({ status: 'closed', endDate: survey.endDate ?? new Date() });
    return this.loadSurvey(surveyId, req);
  }

  async submit(surveyId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    const survey = await this.loadSurvey(surveyId, req);
    if (survey.status !== 'active') throw new ApiError(400, 'survey.notActive');
    const userId = actorId(req);
    const existing = await SurveyResponse.findOne({ where: { surveyId, userId } });
    if (existing) throw new ApiError(409, 'survey.alreadySubmitted');

    const answers = (body.answers as Array<Record<string, unknown>> | undefined) ?? [];
    const questions: any[] = survey.questions ?? [];
    const answerMap = new Map<number, Record<string, unknown>>();
    for (const answer of answers) {
      const questionId = Number(answer.questionId);
      if (questionId) answerMap.set(questionId, answer);
    }
    for (const question of questions) {
      if (!question.required) continue;
      const answer = answerMap.get(question.id);
      const hasValue =
        answer &&
        (answer.rating !== undefined && answer.rating !== null
          ? true
          : answer.answer !== undefined && answer.answer !== null && String(answer.answer).trim() !== ''
            ? true
            : Array.isArray(answer.choice) && answer.choice.length > 0
              ? true
              : typeof answer.choice === 'string' && answer.choice !== '');
      if (!hasValue) throw new ApiError(400, 'survey.requiredAnswer', { questionId: question.id });
    }

    const user = await User.findByPk(userId, { attributes: ['id', 'departmentId'] });
    const response = await SurveyResponse.create({
      surveyId,
      userId,
      departmentId: user?.departmentId ?? null,
      submittedAt: new Date(),
    });
    if (answerMap.size > 0) {
      await SurveyAnswer.bulkCreate(
        [...answerMap.entries()].map(([questionId, answer]) => ({
          responseId: response.id,
          questionId,
          rating: answer.rating != null ? Number(answer.rating) : null,
          answer: answer.answer != null ? String(answer.answer) : null,
          choice: Array.isArray(answer.choice)
            ? (answer.choice as string[])
            : answer.choice != null
              ? [String(answer.choice)]
              : null,
        })),
      );
    }
    queueWebhookEvent(survey.orgId, 'survey.submitted', {
      surveyId,
      responseId: response.id,
      anonymous: survey.isAnonymous,
    });
    return this.analytics(surveyId, req);
  }

  async analytics(surveyId: number, req: Request): Promise<SurveyAnalytics> {
    const survey = await this.loadSurvey(surveyId, req);
    const questions: any[] = survey.questions ?? [];
    const responses = await SurveyResponse.findAll({
      where: { surveyId },
      include: [{ model: SurveyAnswer, as: 'answers' }],
    });
    const audience = await User.count({ where: { ...tenantScope(req), status: 'active' } });

    const answerByQuestion = new Map<number, SurveyAnswer[]>();
    for (const response of responses) {
      for (const answer of (response as any).answers ?? []) {
        const list = answerByQuestion.get(answer.questionId) ?? [];
        list.push(answer);
        answerByQuestion.set(answer.questionId, list);
      }
    }

    let enps: number | null = null;
    const questionStats = questions.map((question) => {
      const list = answerByQuestion.get(question.id) ?? [];
      const ratings = list.map((a) => a.rating).filter((r): r is number => r != null);
      const average = ratings.length > 0 ? round2(ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : null;
      const distribution: Record<string, number> = {};
      for (const answer of list) {
        const key =
          answer.rating != null
            ? String(answer.rating)
            : Array.isArray(answer.choice)
              ? answer.choice.join(', ')
              : answer.answer ?? 'text';
        if (key === '') continue;
        distribution[key] = (distribution[key] ?? 0) + 1;
      }
      if (question.type === 'enps' && ratings.length > 0) {
        const promoters = ratings.filter((r) => r >= 9).length;
        const detractors = ratings.filter((r) => r <= 6).length;
        enps = round2(((promoters - detractors) / ratings.length) * 100);
      }
      return {
        questionId: question.id,
        title: question.title,
        type: question.type,
        responseCount: list.length,
        average,
        distribution,
      };
    });

    const departmentStats = new Map<number | null, { responses: number; ratings: number[] }>();
    for (const response of responses) {
      const key = response.departmentId ?? null;
      const entry = departmentStats.get(key) ?? { responses: 0, ratings: [] };
      entry.responses += 1;
      for (const answer of (response as any).answers ?? []) {
        if (answer.rating != null) entry.ratings.push(answer.rating);
      }
      departmentStats.set(key, entry);
    }
    const departmentIds = [...departmentStats.keys()].filter((id): id is number => id != null);
    const departments = departmentIds.length
      ? await Department.findAll({ where: { id: { [Op.in]: departmentIds } }, attributes: ['id', 'name'] })
      : [];
    const departmentNames = new Map(departments.map((d) => [d.id, d.name]));

    return {
      survey: {
        id: survey.id,
        title: survey.title,
        type: survey.type,
        status: survey.status,
        isAnonymous: survey.isAnonymous,
      },
      responses: responses.length,
      audience,
      participationRate: audience > 0 ? round2((responses.length / audience) * 100) : 0,
      enps,
      questions: questionStats,
      byDepartment: [...departmentStats.entries()].map(([departmentId, entry]) => ({
        departmentId,
        departmentName: departmentId != null ? departmentNameOf(departmentNames, departmentId) : null,
        responses: entry.responses,
        average:
          entry.ratings.length > 0
            ? round2(entry.ratings.reduce((sum, r) => sum + r, 0) / entry.ratings.length)
            : null,
      })),
    };
  }
}

const departmentNameOf = (names: Map<number, string>, id: number): string | null => names.get(id) ?? null;

export const surveyService = new SurveyService();
export default surveyService;
