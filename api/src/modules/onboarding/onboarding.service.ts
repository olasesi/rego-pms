import type { Request } from 'express';
import {
  OnboardingTemplate,
  OnboardingTemplateTask,
  OnboardingAssignment,
  OnboardingTaskProgress,
  User,
} from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { actorId, tenantScope } from '../../common/utils/access';

const userSummary = ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'title'];

const templateIncludes = [
  { model: OnboardingTemplateTask, as: 'tasks', separate: true, order: [['sortOrder', 'ASC']] as [string, string][] },
];

const assignmentIncludes = [
  { model: OnboardingTemplate, as: 'template', attributes: ['id', 'name', 'type'] },
  { model: User, as: 'user', attributes: userSummary },
  {
    model: OnboardingTaskProgress,
    as: 'tasks',
    include: [{ model: OnboardingTemplateTask, as: 'templateTask' }],
  },
];

export class OnboardingTemplateService extends CrudService {
  constructor() {
    super({
      model: OnboardingTemplate,
      moduleKey: 'onboardingTemplate',
      tenantScoped: true,
      searchFields: ['name', 'description'],
      filters: [{ field: 'type' }, { field: 'status' }],
      include: templateIncludes,
      detailInclude: templateIncludes,
      defaultSortBy: 'createdAt',
      notFoundKey: 'onboarding.templateNotFound',
    });
  }

  async addTask(templateId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    await this.findById(templateId, req);
    return OnboardingTemplateTask.create({ ...body, templateId } as any);
  }

  async updateTask(templateId: number, taskId: number, body: Record<string, unknown>, req: Request): Promise<any> {
    await this.findById(templateId, req);
    const task = await OnboardingTemplateTask.findOne({ where: { id: taskId, templateId } });
    if (!task) throw new ApiError(404, 'onboarding.taskNotFound');
    await task.update(body);
    return task;
  }

  async removeTask(templateId: number, taskId: number, req: Request): Promise<void> {
    await this.findById(templateId, req);
    const task = await OnboardingTemplateTask.findOne({ where: { id: taskId, templateId } });
    if (!task) throw new ApiError(404, 'onboarding.taskNotFound');
    await task.destroy();
  }
}

export class OnboardingService {
  async assign(
    templateId: number,
    body: Record<string, unknown>,
    templateService: OnboardingTemplateService,
    req: Request,
  ): Promise<any> {
    const template = await templateService.findById(templateId, req);
    if (template.status !== 'active') throw new ApiError(400, 'onboarding.templateArchived');
    const orgId = req.tenantId;
    if (orgId == null) throw new ApiError(400, 'common.invalidRequest');

    const assignment = await OnboardingAssignment.create({
      orgId,
      userId: Number(body.userId),
      templateId,
      type: template.type,
      startDate: body.startDate != null ? String(body.startDate) : null,
      dueDate: body.dueDate != null ? String(body.dueDate) : null,
      status: 'pending',
    });

    const tasks: any[] = template.tasks ?? [];
    if (tasks.length > 0) {
      await OnboardingTaskProgress.bulkCreate(
        tasks.map((task) => ({
          assignmentId: assignment.id,
          templateTaskId: task.id,
          status: 'pending',
        })),
      );
    } else {
      await assignment.update({ status: 'completed', completedAt: new Date() });
    }
    return this.findById(assignment.id, req);
  }

  async findById(id: number, req: Request): Promise<any> {
    const assignment = await OnboardingAssignment.findOne({
      where: { id, ...tenantScope(req) },
      include: assignmentIncludes,
    });
    if (!assignment) throw new ApiError(404, 'onboarding.assignmentNotFound');
    return assignment;
  }

  async list(req: Request): Promise<any[]> {
    const where: Record<string, unknown> = { ...tenantScope(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    if (req.query.userId) where.userId = Number(req.query.userId);
    return OnboardingAssignment.findAll({
      where,
      include: assignmentIncludes,
      order: [['createdAt', 'DESC']],
    });
  }

  async mine(req: Request): Promise<any[]> {
    return OnboardingAssignment.findAll({
      where: { userId: actorId(req), ...tenantScope(req) },
      include: assignmentIncludes,
      order: [['createdAt', 'DESC']],
    });
  }

  private async recalculate(assignmentId: number): Promise<any> {
    const assignment = await OnboardingAssignment.findByPk(assignmentId);
    if (!assignment) throw new ApiError(404, 'onboarding.assignmentNotFound');
    const tasks = await OnboardingTaskProgress.findAll({ where: { assignmentId } });
    const started = tasks.filter((t) => t.status !== 'pending').length;
    const finished = tasks.filter((t) => t.status === 'completed' || t.status === 'skipped').length;
    if (tasks.length > 0 && finished === tasks.length) {
      await assignment.update({ status: 'completed', completedAt: assignment.completedAt ?? new Date() });
    } else if (started > 0) {
      await assignment.update({ status: 'in_progress', completedAt: null });
    } else {
      await assignment.update({ status: assignment.status === 'cancelled' ? 'cancelled' : 'pending' });
    }
    return assignment;
  }

  async updateTaskProgress(
    assignmentId: number,
    progressId: number,
    body: Record<string, unknown>,
    req: Request,
  ): Promise<any> {
    await this.findById(assignmentId, req);
    const progress = await OnboardingTaskProgress.findOne({
      where: { id: progressId, assignmentId },
    });
    if (!progress) throw new ApiError(404, 'onboarding.progressNotFound');
    const status = body.status as 'pending' | 'completed' | 'skipped' | undefined;
    await progress.update({
      status: status ?? progress.status,
      note: body.note !== undefined ? (body.note as string | null) : progress.note,
      completedAt: status === 'completed' || status === 'skipped' ? new Date() : null,
      completedById: status === 'completed' || status === 'skipped' ? actorId(req) : null,
    });
    await this.recalculate(assignmentId);
    return this.findById(assignmentId, req);
  }

  async cancel(assignmentId: number, req: Request): Promise<any> {
    const assignment = await this.findById(assignmentId, req);
    await assignment.update({ status: 'cancelled', completedAt: null });
    return this.findById(assignmentId, req);
  }
}

export const onboardingTemplateService = new OnboardingTemplateService();
export const onboardingService = new OnboardingService();
