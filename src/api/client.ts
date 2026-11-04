import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

import http from '@/api/http';
import type { ApiEnvelope, ApiErrorEnvelope } from '@/api/types';

/** Normalised API failure carrying the server's i18n error key. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(message: string, status = 0, code = 'common.error', details?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** i18n key for the failure; unknown codes fall back to `common.error`. */
  get translationKey(): string {
    return this.code || 'common.error';
  }
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
  pages?: number;
}

const normalizeError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data;
    const requestId = error.response?.headers?.['x-request-id'] as string | undefined;
    return new ApiError(
      payload?.error?.message ?? error.message ?? 'Request failed',
      status,
      payload?.error?.code ?? 'common.error',
      payload?.error?.details,
      requestId,
    );
  }
  return new ApiError(error instanceof Error ? error.message : 'Request failed');
};

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response: AxiosResponse<ApiEnvelope<T>> = await http.request<ApiEnvelope<T>>(config);
    const envelope = response.data;
    if (envelope && envelope.success === false) {
      throw new ApiError(envelope.message ?? 'Request failed');
    }
    return envelope?.data as T;
  } catch (error) {
    throw normalizeError(error);
  }
}

export const api = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, method: 'GET', url });
  },

  async list<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<PagedResult<T>> {
    try {
      const response = await http.request<ApiEnvelope<T[]>>({
        ...config,
        method: 'GET',
        url,
        params,
      });
      const envelope = response.data;
      const items = envelope?.data ?? [];
      const headerTotal = Number(response.headers?.['x-total-count']);
      const meta = envelope?.meta;
      return {
        items,
        total: Number.isFinite(headerTotal) ? headerTotal : (meta?.total ?? items.length),
        page: meta?.page,
        limit: meta?.limit,
        pages: meta?.pages,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  },

  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, method: 'POST', url, data: body });
  },

  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, method: 'PUT', url, data: body });
  },

  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, method: 'PATCH', url, data: body });
  },

  delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ ...config, method: 'DELETE', url });
  },
};

export default api;
