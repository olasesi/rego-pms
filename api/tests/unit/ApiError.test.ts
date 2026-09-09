import { ApiError } from '../../src/common/utils/ApiError';

describe('ApiError', () => {
  it('builds from (statusCode, key)', () => {
    const err = new ApiError(404, 'user.notFound');
    expect(err.statusCode).toBe(404);
    expect(err.translationKey).toBe('user.notFound');
    expect(err.code).toBe('API_ERROR');
    expect(err.name).toBe('ApiError');
  });

  it('captures details passed as legacy 3rd positional arg', () => {
    const err = new ApiError(400, 'validation.failed', { field: 'nope' });
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: 'nope' });
  });

  it('supports (status, key, details, code)', () => {
    const err = new ApiError(403, 'auth.forbidden', undefined, 'FORBIDDEN');
    expect(err.code).toBe('FORBIDDEN');
  });

  it('supports options object with details/code/expose', () => {
    const err = new ApiError(500, 'common.internal', { details: 'x' }, 'INTERNAL');
    expect(err.details).toEqual({ details: 'x' });
    expect(err.code).toBe('INTERNAL');
    expect(err.expose).toBe(false);
  });

  it('is an instanceof Error with stack', () => {
    const err = new ApiError(400, 'common.badRequest');
    expect(err).toBeInstanceOf(Error);
    expect(typeof err.stack).toBe('string');
  });
});