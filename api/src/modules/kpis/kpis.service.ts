import type { Request } from 'express';
import { Kpi, KpiEntry } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';
import { percent } from '../../common/utils/helpers';

export class KpiService extends CrudService {
  constructor() {
    super({
      model: Kpi,
      moduleKey: 'kpi',
      tenantScoped: true,
      searchFields: ['name', 'description'],
      filters: [
        { field: 'status', type: 'eq' },
        { field: 'ownerType', type: 'eq' },
        { field: 'ownerId', type: 'eq' },
        { field: 'periodUnit', type: 'eq' },
      ],
      defaultSortBy: 'createdAt',
      detailInclude: [{ model: KpiEntry, as: 'entries' }],
      notFoundKey: 'kpi.notFound',
      beforeCreate: (data, req) => {
        data.createdById = req.user!.id;
        return data;
      },
    });
  }

  async listEntries(kpiId: number, req: Request): Promise<KpiEntry[]> {
    await this.findById(kpiId, req);
    return KpiEntry.findAll({ where: { kpiId }, order: [['recordedAt', 'DESC']] });
  }

  async addEntry(kpiId: number, body: { value: number; periodStart?: string; periodEnd?: string; note?: string }, req: Request): Promise<KpiEntry> {
    await this.findById(kpiId, req);
    return KpiEntry.create({
      kpiId,
      value: body.value,
      periodStart: body.periodStart ?? null,
      periodEnd: body.periodEnd ?? null,
      note: body.note ?? null,
      recordedById: req.user!.id,
    });
  }

  async updateEntry(kpiId: number, entryId: number, body: Record<string, unknown>, req: Request): Promise<KpiEntry> {
    await this.findById(kpiId, req);
    const entry = await KpiEntry.findOne({ where: { id: entryId, kpiId } });
    if (!entry) throw new ApiError(404, 'kpi.entryNotFound');
    const patch: Record<string, unknown> = {};
    for (const field of ['value', 'periodStart', 'periodEnd', 'note'] as const) {
      if (body[field] !== undefined) patch[field] = body[field];
    }
    await entry.update(patch);
    return entry.reload();
  }

  async removeEntry(kpiId: number, entryId: number, req: Request): Promise<{ id: number; deleted: true }> {
    await this.findById(kpiId, req);
    await KpiEntry.destroy({ where: { id: entryId, kpiId } });
    return { id: entryId, deleted: true };
  }

  async attainment(kpi: Kpi, entries: KpiEntry[]): Promise<{ current: number; target: number; attainment: number }> {
    const latest = entries.slice().sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    const current = latest?.value ?? 0;
    return { current, target: kpi.targetValue, attainment: percent(current, kpi.targetValue) };
  }
}

export const kpiService = new KpiService();
export default kpiService;