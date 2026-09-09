import { describe, expect, it } from 'vitest';

import { formatShortDate, formatDateTime } from '@/utils/format';

describe('format utils', () => {
  it('formats an ISO date as short date', () => {
    expect(formatShortDate('2024-06-15T10:00:00.000Z')).toBe('2024-06-15');
  });

  it('formats date-time', () => {
    const value = formatDateTime(new Date(2024, 0, 2, 9, 5, 0));
    expect(value).toMatch(/^2024-01-02 09:05$/);
  });

  it('returns placeholder for empty values', () => {
    expect(formatShortDate(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
  });
});