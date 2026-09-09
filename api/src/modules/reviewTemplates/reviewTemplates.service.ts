import type { Request } from 'express';
import { ReviewTemplate, ReviewQuestion } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';

const templateIncludes = [{ model: ReviewQuestion, as: 'questions', attributes: ['id', 'section', 'title', 'type', 'options', 'weight', 'required', 'maxRating', 'sortOrder'] }];

export class ReviewTemplateService extends CrudService {
  constructor() {
    super({
      model: ReviewTemplate,
      moduleKey: 'template',
      tenantScoped: true,
      searchFields: ['name', 'description'],
      filters: [{ field: 'status', type: 'eq' }],
      defaultSortBy: 'createdAt',
      include: templateIncludes,
      detailInclude: templateIncludes,
      notFoundKey: 'template.notFound',
      beforeCreate: (data, req) => {
        data.createdById = req.user!.id;
        return data;
      },
      beforeUpdate: (data) => data,
      validateUpdate: async (data, id) => {
        if (Object.prototype.hasOwnProperty.call(data, 'status')) void id;
      },
    });
  }

  async addQuestion(templateId: number, body: Record<string, unknown>, req: Request): Promise<ReviewQuestion> {
    await this.findById(templateId, req);
    return ReviewQuestion.create({
      templateId,
      section: (body.section as string | undefined) ?? null,
      title: body.title as string,
      type: (body.type as ReviewQuestion['type'] | undefined) ?? 'rating',
      options: (body.options as string[] | undefined) ?? null,
      weight: (body.weight as number | undefined) ?? 1,
      required: (body.required as boolean | undefined) ?? true,
      maxRating: (body.maxRating as number | undefined) ?? 5,
      sortOrder: (body.sortOrder as number | undefined) ?? 0,
    });
  }

  async updateQuestion(templateId: number, questionId: number, body: Record<string, unknown>, req: Request): Promise<ReviewQuestion> {
    await this.findById(templateId, req);
    const question = await ReviewQuestion.findOne({ where: { id: questionId, templateId } });
    if (!question) throw new ApiError(404, 'template.questionNotFound');
    const patch: Record<string, unknown> = {};
    for (const field of ['section', 'title', 'type', 'options', 'weight', 'required', 'maxRating', 'sortOrder'] as const) {
      if (body[field] !== undefined) patch[field] = body[field];
    }
    await question.update(patch);
    return question.reload();
  }

  async removeQuestion(templateId: number, questionId: number, req: Request): Promise<{ id: number; deleted: true }> {
    await this.findById(templateId, req);
    await ReviewQuestion.destroy({ where: { id: questionId, templateId } });
    return { id: questionId, deleted: true };
  }
}

export const reviewTemplateService = new ReviewTemplateService();
export default reviewTemplateService;