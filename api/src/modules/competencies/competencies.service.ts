import type { Request } from 'express';
import { Op } from 'sequelize';
import { CompetencyFramework, Competency, SkillAssessment } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';

const frameworkIncludes = [{ model: Competency, as: 'competencies' }];

export class CompetencyService extends CrudService {
  constructor() {
    super({
      model: CompetencyFramework,
      moduleKey: 'competency',
      tenantScoped: true,
      searchFields: ['name', 'description'],
      filters: [{ field: 'status', type: 'eq' }],
      defaultSortBy: 'createdAt',
      include: frameworkIncludes,
      detailInclude: frameworkIncludes,
      notFoundKey: 'competency.frameworkNotFound',
      beforeCreate: (data, req) => {
        data.createdById = req.user!.id;
        return data;
      },
    });
  }

  async addCompetency(frameworkId: number, body: Record<string, unknown>, req: Request): Promise<Competency> {
    await this.findById(frameworkId, req);
    return Competency.create({
      frameworkId,
      name: body.name as string,
      description: (body.description as string | undefined) ?? null,
      category: (body.category as string | undefined) ?? null,
      weight: (body.weight as number | undefined) ?? 1,
      maxLevel: (body.maxLevel as number | undefined) ?? 5,
      sortOrder: (body.sortOrder as number | undefined) ?? 0,
    });
  }

  async updateCompetency(frameworkId: number, competencyId: number, body: Record<string, unknown>, req: Request): Promise<Competency> {
    await this.findById(frameworkId, req);
    const competency = await Competency.findOne({ where: { id: competencyId, frameworkId } });
    if (!competency) throw new ApiError(404, 'competency.notFound');
    const patch: Record<string, unknown> = {};
    for (const field of ['name', 'description', 'category', 'weight', 'maxLevel', 'sortOrder'] as const) {
      if (body[field] !== undefined) patch[field] = body[field];
    }
    await competency.update(patch);
    return competency.reload();
  }

  async removeCompetency(frameworkId: number, competencyId: number, req: Request): Promise<{ id: number; deleted: true }> {
    await this.findById(frameworkId, req);
    await Competency.destroy({ where: { id: competencyId, frameworkId } });
    return { id: competencyId, deleted: true };
  }

  async assess(body: { userId: number; competencyId: number; level: number; type?: 'self' | 'manager'; evidence?: string }, req: Request): Promise<SkillAssessment> {
    const competency = await Competency.findOne({
      where: { id: body.competencyId },
      include: [{ model: CompetencyFramework, as: 'framework', attributes: ['id', 'orgId'], where: { orgId: req.tenantId } }],
    });
    if (!competency) throw new ApiError(404, 'competency.notFound');
    const maxLevel = competency.maxLevel ?? 5;
    if (body.level < 1 || body.level > maxLevel) {
      throw new ApiError(400, 'competency.invalidLevel', { level: `Level must be between 1 and ${maxLevel}` });
    }
    const type = body.type ?? 'self';
    if (type === 'manager' && !req.user?.permissions.includes('competencies:assess') && !req.user?.roles.includes('manager')) {
      throw new ApiError(403, 'auth.forbidden');
    }
    const [assessment] = await SkillAssessment.findOrCreate({
      where: { userId: body.userId, competencyId: body.competencyId, assessedByType: type },
      defaults: {
        orgId: req.tenantId as number,
        userId: body.userId,
        competencyId: body.competencyId,
        level: body.level,
        assessedByType: type,
        assessedById: req.user!.id,
        evidence: body.evidence ?? null,
      },
    });
    if (assessment) await assessment.update({ level: body.level, assessedById: req.user!.id, evidence: body.evidence ?? null });
    return assessment;
  }

  async gapAnalysis(userId: number, req: Request): Promise<unknown[]> {
    const assessments = await SkillAssessment.findAll({ where: { userId, orgId: req.tenantId as number } });
    const byCompetency = new Map<number, SkillAssessment[]>();
    for (const a of assessments) {
      const arr = byCompetency.get(a.competencyId) ?? [];
      arr.push(a);
      byCompetency.set(a.competencyId, arr);
    }
    const competencies = await Competency.findAll({
      where: { id: { [Op.in]: [...byCompetency.keys()] } },
      include: [{ model: CompetencyFramework, as: 'framework', attributes: ['id', 'name'] }],
    });
    return competencies.map((competency) => {
      const rows = byCompetency.get(competency.id) ?? [];
      const self = rows.find((r) => r.assessedByType === 'self');
      const manager = rows.find((r) => r.assessedByType === 'manager');
      const desired = manager?.level ?? competency.maxLevel;
      const current = self?.level ?? 0;
      return {
        competencyId: competency.id,
        name: competency.name,
        framework: competency.framework?.name ?? null,
        maxLevel: competency.maxLevel,
        selfLevel: self?.level ?? null,
        managerLevel: manager?.level ?? null,
        gap: Math.max(0, desired - current),
      };
    });
  }
}

export const competencyService = new CompetencyService();
export default competencyService;