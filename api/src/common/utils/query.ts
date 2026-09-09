import type { Request } from 'express';
import { Op, type OrderItem } from 'sequelize';
import type { ListMeta } from '../types';
import { ApiError } from './ApiError';

export const parseId = (raw: string, _field = 'id'): number => {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError(400, 'common.invalidId', undefined, 'INVALID_ID');
  }
  return value;
};

export interface FilterSpec {
  field: string;
  column?: string;
  type?: 'eq' | 'in' | 'like' | 'date' | 'boolean';
}

export interface ListOptions {
  searchFields?: string[];
  filters?: FilterSpec[];
  defaultOrder?: [string, string][];
  defaultSortBy?: string;
  searchable?: boolean;
}

// Legacy-removed: see new signatures below.
const clampLimit = (value: number): number => Math.max(1, Math.min(100, value));

export const getPagination = (query: Request['query']): { page: number; limit: number; offset: number } => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = clampLimit(Number(query.limit) || 25);
  return { page, limit, offset: (page - 1) * limit };
};

export const paginateMeta = (page: number, limit: number, total: number): ListMeta => ({
  page,
  limit,
  total,
  pages: total === 0 ? 0 : Math.ceil(total / limit),
});

export const buildWhere = (
  req: Request,
  options: ListOptions = {},
  scope: Record<string, unknown> = {},
): Record<string, unknown> => {
  const where: Record<string, unknown> = { ...scope };
  const { searchFields, filters = [] } = options;
  const search = req.query.search as string | undefined;
  if (search && search.trim() !== '' && searchFields && searchFields.length > 0) {
    where[Op.or as unknown as string] = searchFields.map((field) => ({
      [field]: { [Op.like]: `%${search.trim()}%` },
    }));
  }
  for (const filter of filters) {
    const raw = req.query[filter.field];
    if (raw === undefined || raw === null || raw === '') continue;
    const column = filter.column ?? filter.field;
    const value = String(raw);
    const type = filter.type ?? 'eq';
    switch (type) {
      case 'eq':
        where[column] = /^\d+$/.test(value) ? Number(value) : value;
        break;
      case 'boolean':
        where[column] = value === 'true' || value === '1';
        break;
      case 'date':
        where[column] = { [Op.gte]: new Date(value) };
        break;
      case 'in':
        where[column] = { [Op.in]: value.split(',').map((v) => { const n = Number(v); return Number.isNaN(n) ? v : n; }) };
        break;
      case 'like':
        where[column] = { [Op.like]: `%${value}%` };
        break;
      default:
        where[column] = value;
    }
  }
  return where;
};

export const buildOrder = (req: Request, options: ListOptions = {}): OrderItem[] => {
  const sortBy = (req.query.sortBy as string) || options.defaultSortBy || 'createdAt';
  const direction = (String(req.query.order).toLowerCase() === 'asc' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
  return [...(options.defaultOrder ?? []), [sortBy, direction] as OrderItem];
};

export const normalizeSortColumn = (column: string): string =>
  column.replace(/[^a-zA-Z0-9_.]/g, '');