import type { Request } from 'express';
import { ReviewCycle, PerformanceReview } from '../../models';
import { CrudService } from '../../common/services/crud';
import { ApiError } from '../../common/utils/ApiError';

export class ReviewCycleService extends CrudService {
  constructor() {
    super({
      model: ReviewCycle,
      moduleKey: 'cycle',
      tenantScoped: true,
      searchFields: ['name', 'description'],
      filters: [{ field: 'status', type: 'eq' }, { field: 'period', type: 'eq' }],
      defaultSortBy: 'createdAt',
      include: [{ model: PerformanceReview, as: 'reviews', attributes: ['id', 'status'] }],
      notFoundKey: 'cycle.notFound',
      beforeCreate: (data, req) => {
        data.createdById = req.user!.id;
        return data;
      },
    });
  }

  async changeStatus(id: number, status: ReviewCycle['status'], req: Request): Promise<ReviewCycle> {
    const cycle = await this.findById(id, req);
    await cycle.update({ status });
    return this.findById(id, req);
  }

  async close(id: number, req: Request): Promise<ReviewCycle> {
    const cycle = await this.findById(id, req);
    if (cycle.status !== 'active') throw new ApiError(400, 'cycle.cannotClose');
    await cycle.update({ status: 'closed' });
    await PerformanceReview.update({ status: 'signed_off' }, { where: { cycleId: id, status: 'approved' } });
    return this.findById(id, req);
  }
}

export const reviewCycleService = new ReviewCycleService();
export default reviewCycleService;