import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken, randomToken } from '../../src/common/security/tokens';

describe('token helpers', () => {
  it('signs and verifies an access token with expected payload', () => {
    const token = signAccessToken(12, 3, 'user@pms.local');
    const payload = verifyAccessToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('12');
    expect(payload?.orgId).toBe(3);
    expect(payload?.email).toBe('user@pms.local');
    expect(payload?.type).toBe('access');
  });

  it('signs and verifies a refresh token', () => {
    const token = signRefreshToken(5);
    const payload = verifyRefreshToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('5');
    expect(payload?.type).toBe('refresh');
  });

  it('rejects tampered tokens', () => {
    const token = signAccessToken(1, null, 'a@b.c');
    expect(verifyAccessToken(`${token}x`)).toBeNull();
  });

  it('hashes deterministically and generates random tokens', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
    const t1 = randomToken(24);
    const t2 = randomToken(24);
    expect(t1).toHaveLength(32);
    expect(t1).not.toBe(t2);
  });
});