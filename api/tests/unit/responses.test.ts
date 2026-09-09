import { sendOk, sendCreated, sendEmpty } from '../../src/common/utils/responses';
import type { Response } from 'express';

const mockResponse = (): Response => {
  const res = { statusCode: 0, body: undefined as unknown } as Partial<Response> & { body: unknown };
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  res.send = jest.fn().mockReturnThis();
  return res as unknown as Response;
};

describe('response envelope helpers', () => {
  it('sendOk returns success envelope with optional meta and message', () => {
    const res = mockResponse();
    sendOk(res, { id: 1 }, { page: 1, limit: 25, total: 1, pages: 1 }, 'All good');
    expect(res.statusCode).toBe(200);
    expect((res as unknown as { body: Record<string, unknown> }).body).toEqual({
      success: true,
      data: { id: 1 },
      meta: { page: 1, limit: 25, total: 1, pages: 1 },
      message: 'All good',
    });
  });

  it('sendOk omits meta and message when absent', () => {
    const res = mockResponse();
    sendOk(res, 'plain');
    expect((res as unknown as { body: Record<string, unknown> }).body).toEqual({
      success: true,
      data: 'plain',
    });
  });

  it('sendCreated returns 201', () => {
    const res = mockResponse();
    sendCreated(res, { id: 7 }, 'Created');
    expect(res.statusCode).toBe(201);
    expect((res as unknown as { body: Record<string, unknown> }).body).toEqual({
      success: true,
      data: { id: 7 },
      message: 'Created',
    });
  });

  it('sendEmpty returns 204 status', () => {
    const res = mockResponse();
    sendEmpty(res);
    expect(res.statusCode).toBe(204);
  });
});