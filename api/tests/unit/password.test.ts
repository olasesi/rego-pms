import { hashPassword, verifyPassword, isValidPasswordStrength } from '../../src/common/security/password';

describe('password helpers', () => {
  it('hashes and verifies a password round-trip', async () => {
    const hash = await hashPassword('sup3rSecret');
    expect(hash).not.toBe('sup3rSecret');
    await expect(verifyPassword('sup3rSecret', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('validates password strength', () => {
    expect(isValidPasswordStrength('Passw0rd')).toBe(true);
    expect(isValidPasswordStrength('short')).toBe(false);
    expect(isValidPasswordStrength('onlyletters')).toBe(false);
    expect(isValidPasswordStrength('12345678')).toBe(false);
    expect(isValidPasswordStrength('')).toBe(false);
  });
});