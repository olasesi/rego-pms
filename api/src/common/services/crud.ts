import type { Request } from 'express';
import { ApiError } from '../utils/ApiError';
import { buildOrder, buildWhere, getPagination, paginateMeta, type FilterSpec } from '../utils/query';
import type { ListResult } from '../types';

export interface CrudConfig {
  /** Sequelize model ctor */
  model: any;
  /** Namespace used for i18n "not found" keys, e.g. 'goal' -> 'goal.notFound' */
  moduleKey: string;
  searchFields?: string[];
  filters?: FilterSpec[];
  include?: any[];
  detailInclude?: any[];
  defaultSortBy?: string;
  defaultOrder?: [string, string][];
  /** Scope all queries to the requester's tenant (orgId). */
  tenantScoped?: boolean;
  /** Scope queries to rows owned by the requester (e.g. userId). */
  ownershipColumn?: string;
  notFoundKey?: string;
  beforeCreate?: (data: Record<string, unknown>, req: Request) => Promise<Record<string, unknown>> | Record<string, unknown>;
  beforeUpdate?: (
    data: Record<string, unknown>,
    id: number,
    req: Request,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  validateCreate?: (data: Record<string, unknown>, req: Request) => Promise<void> | void;
  validateUpdate?: (data: Record<string, unknown>, id: number, req: Request) => Promise<void> | void;
  canAccess?: (record: any, req: Request) => boolean | Promise<boolean>;
}

export class CrudService {
  constructor(protected readonly cfg: CrudConfig) {}

  protected scopeWhere(req: Request): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (this.cfg.tenantScoped && req.tenantId != null) where.orgId = req.tenantId;
    if (this.cfg.ownershipColumn && req.user) where[this.cfg.ownershipColumn] = req.user.id;
    return where;
  }

  protected async ensureAccess(record: any, req: Request): Promise<void> {
    if (this.cfg.canAccess) {
      const allowed = await this.cfg.canAccess(record, req);
      if (!allowed) throw new ApiError(403, 'auth.forbidden');
    }
  }

  async list(req: Request): Promise<ListResult<any>> {
    const scope = this.scopeWhere(req);
    const where = buildWhere(req, { searchFields: this.cfg.searchFields, filters: this.cfg.filters }, scope);
    const { page, limit, offset } = getPagination(req.query);
    const order = buildOrder(req, { defaultOrder: this.cfg.defaultOrder, defaultSortBy: this.cfg.defaultSortBy });
    const { rows, count } = await this.cfg.model.findAndCountAll({
      where,
      include: this.cfg.include ?? [],
      order,
      limit,
      offset,
      distinct: true,
    });
    return { rows, meta: paginateMeta(page, limit, count) };
  }

  async findById(id: number, req: Request): Promise<any> {
    const record = await this.cfg.model.findOne({
      where: { ...this.scopeWhere(req), id },
      include: this.cfg.detailInclude ?? this.cfg.include ?? [],
    });
    if (!record) throw new ApiError(404, this.cfg.notFoundKey ?? `${this.cfg.moduleKey}.notFound`);
    await this.ensureAccess(record, req);
    return record;
  }

  async create(body: Record<string, unknown>, req: Request): Promise<any> {
    if (this.cfg.validateCreate) await this.cfg.validateCreate(body, req);
    let data: Record<string, unknown> = { ...body };
    if (this.cfg.beforeCreate) data = { ...data, ...(await this.cfg.beforeCreate(data, req)) };
    if (this.cfg.tenantScoped && data.orgId === undefined && req.tenantId != null) data.orgId = req.tenantId;
    const record = await this.cfg.model.create(data);
    return this.findById(record.id, req);
  }

  async update(id: number, body: Record<string, unknown>, req: Request): Promise<any> {
    await this.findById(id, req);
    if (this.cfg.validateUpdate) await this.cfg.validateUpdate(body, id, req);
    let data: Record<string, unknown> = { ...body };
    if (this.cfg.beforeUpdate) data = { ...data, ...(await this.cfg.beforeUpdate(data, id, req)) };
    await this.cfg.model.update(data, { where: { ...this.scopeWhere(req), id } });
    return this.findById(id, req);
  }

  async remove(id: number, req: Request): Promise<{ id: number; deleted: boolean }> {
    await this.findById(id, req);
    await this.cfg.model.destroy({ where: { ...this.scopeWhere(req), id } });
    return { id, deleted: true };
  }
}

export default CrudService;