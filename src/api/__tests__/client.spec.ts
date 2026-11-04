import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/http', () => ({
  default: { request: vi.fn() },
}));

import http from '@/api/http';
import { ApiError, api } from '@/api/client';

const request = vi.mocked(http.request);

describe('typed API client', () => {
  beforeEach(() => {
    request.mockReset();
  });

  it('unwraps the response envelope', async () => {
    request.mockResolvedValueOnce({ data: { success: true, data: { id: 7 } } } as never);
    await expect(api.get<{ id: number }>('/users/7')).resolves.toEqual({ id: 7 });
  });

  it('reads the total from X-Total-Count and falls back to meta', async () => {
    request.mockResolvedValueOnce({
      data: { success: true, data: [{ id: 1 }], meta: { page: 1, limit: 10, total: 1, pages: 1 } },
      headers: { 'x-total-count': '42' },
    } as never);

    const result = await api.list<{ id: number }>('/users');
    expect(result.items).toEqual([{ id: 1 }]);
    expect(result.total).toBe(42);

    request.mockResolvedValueOnce({
      data: { success: true, data: [{ id: 2 }], meta: { page: 2, limit: 5, total: 12, pages: 3 } },
      headers: {},
    } as never);

    const fallback = await api.list<{ id: number }>('/users');
    expect(fallback).toMatchObject({ total: 12, page: 2, limit: 5, pages: 3 });
  });

  it('throws ApiError when the envelope reports failure', async () => {
    request.mockResolvedValue({
      data: { success: false, message: 'Nope' },
    } as never);

    await expect(api.post('/users', {})).rejects.toBeInstanceOf(ApiError);
    await expect(api.post('/users', {})).rejects.toMatchObject({ code: 'common.error' });
  });

  it('normalises Axios failures with the server i18n code', async () => {
    request.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Request failed with status code 403',
      response: {
        status: 403,
        data: {
          success: false,
          error: { message: 'Forbidden', code: 'common.forbidden', details: { reason: 'rbac' } },
        },
        headers: { 'x-request-id': 'req-123' },
      },
    });

    const error = await api.delete('/users/9').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(403);
    expect(apiError.code).toBe('common.forbidden');
    expect(apiError.translationKey).toBe('common.forbidden');
    expect(apiError.requestId).toBe('req-123');
    expect(apiError.details).toEqual({ reason: 'rbac' });
  });
});
