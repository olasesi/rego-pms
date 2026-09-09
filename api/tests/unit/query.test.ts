import { parseId } from '../../src/common/utils/query';
import { ApiError } from '../../src/common/utils/ApiError';

describe('parseId', () => {
  it('parses a positive integer', () => {
    expect(parseId('42')).toBe(42);
  });

  it('rejects non-integer, zero, negative, and alpha values', () => {
    expect(() => parseId('abc')).toThrow(ApiError);
    expect(() => parseId('0')).toThrow(ApiError);
    expect(() => parseId('-3')).toThrow(ApiError);
    expect(() => parseId('1.5')).toThrow(ApiError);
    expect(() => parseId('')).toThrow(ApiError);
  });

  it('returns ApiError with 400 status', () => {
    try {
      parseId('nope');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(400);
    }
  });
});