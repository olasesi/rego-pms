import { Token, User, UserRole, Role, Department, Organization } from '../../models';
import { ApiError } from '../../common/utils/ApiError';
import { hashPassword, verifyPassword, isValidPasswordStrength } from '../../common/security/password';
import {
  randomToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../common/security/tokens';
import { config } from '../../config/env';
import { log } from '../../config/logger';
import { notifyUser } from '../../common/services/notification';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserProfile {
  id: number;
  orgId: number | null;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  status: string;
  departmentId: number | null;
  managerId: number | null;
  department?: unknown | null;
  manager?: unknown | null;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  title?: string;
  locale?: string;
  timezone?: string;
  orgId?: number;
  departmentId?: number;
  managerId?: number;
}

const publicUserProfile = (user: User): AuthUserProfile => ({
  id: user.id,
  orgId: user.orgId,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  title: user.title ?? null,
  avatarUrl: user.avatarUrl ?? null,
  locale: user.locale,
  timezone: user.timezone,
  status: user.status,
  departmentId: user.departmentId ?? null,
  managerId: user.managerId ?? null,
  department: user.department ?? null,
  manager: user.manager ?? null,
});

async function ensureUniqueEmail(email: string): Promise<void> {
  const existing = await User.findOne({ where: { email }, attributes: ['id'] });
  if (existing) throw new ApiError(409, 'auth.userExists');
}

async function createRefreshToken(userId: number, ip: string | null, userAgent: string | null): Promise<string> {
  const raw = signRefreshToken(userId);
  const decoded = verifyRefreshToken(raw);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Token.create({
    userId,
    type: 'refresh',
    tokenHash: hashToken(raw),
    expiresAt,
    ip,
    userAgent,
  });
  return raw;
}

export class AuthService {
  async register(input: RegisterInput, _ip: string | null, _userAgent: string | null): Promise<AuthUserProfile> {
    if (!isValidPasswordStrength(input.password)) {
      throw new ApiError(400, 'validation.failed', { password: 'Password must be at least 8 characters and include a number' });
    }
    await ensureUniqueEmail(input.email.toLowerCase());

    let orgId: number | null = input.orgId ?? null;
    if (orgId == null) {
      const defaultOrg = await Organization.findOne({ where: { status: 'active' }, order: [['id', 'ASC']], attributes: ['id'] });
      orgId = defaultOrg?.id ?? null;
    }

    const user = await User.create({
      orgId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      title: input.title ?? null,
      locale: input.locale ?? config.SEED_ADMIN_LOCALE,
      timezone: input.timezone ?? 'UTC',
      departmentId: input.departmentId ?? null,
      managerId: input.managerId ?? null,
      status: 'active',
      emailVerifiedAt: null,
    });

    const employeeRole = await Role.findOne({ where: { key: 'employee', orgId: null }, attributes: ['id'] });
    if (employeeRole) {
      await UserRole.create({ userId: user.id, roleId: employeeRole.id });
    }

    await this.sendVerificationEmail(user);
    const profile = await this.getProfile(user.id);
    log.info(`[auth] user registered: ${user.email}`);
    return profile;
  }

  async login(email: string, password: string, ip: string | null, userAgent: string | null): Promise<AuthTokens & { user: AuthUserProfile }> {
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      attributes: ['id', 'passwordHash', 'status'],
    });
    if (!user) throw new ApiError(401, 'auth.invalidCredentials');
    if (user.status !== 'active') throw new ApiError(403, 'auth.accountInactive');
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'auth.invalidCredentials');

    await user.update({ lastLoginAt: new Date() });
    const accessToken = signAccessToken(user.id, user.orgId, email.toLowerCase());
    const refreshToken = await createRefreshToken(user.id, ip, userAgent);
    const profile = await this.getProfile(user.id);
    return { accessToken, refreshToken, user: profile };
  }

  async refresh(refreshToken: string, ip: string | null, userAgent: string | null): Promise<AuthTokens & { user: AuthUserProfile }> {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) throw new ApiError(401, 'auth.invalidToken');

    const tokenHash = hashToken(refreshToken);
    const stored = await Token.findOne({ where: { tokenHash, type: 'refresh' }, attributes: ['id', 'expiresAt', 'revokedAt', 'consumedAt'] });
    if (!stored || stored.revokedAt || stored.consumedAt) throw new ApiError(401, 'auth.invalidToken');
    if (new Date(stored.expiresAt).getTime() < Date.now()) throw new ApiError(401, 'auth.invalidToken');

    const userId = Number(decoded.sub);
    const user = await User.findOne({ where: { id: userId, status: 'active' }, attributes: ['id', 'orgId', 'email'] });
    if (!user) throw new ApiError(401, 'auth.unauthorized');

    const newRefresh = signRefreshToken(userId);
    const newHash = hashToken(newRefresh);
    const newDecoded = verifyRefreshToken(newRefresh);
    const expiresAt = newDecoded?.exp ? new Date(newDecoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await stored.update({ revokedAt: new Date(), replacedByHash: newHash });
    await Token.create({ userId, type: 'refresh', tokenHash: newHash, expiresAt, ip, userAgent });

    const accessToken = signAccessToken(userId, user.orgId, user.email);
    const profile = await this.getProfile(userId);
    return { accessToken, refreshToken: newRefresh, user: profile };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await Token.update({ revokedAt: new Date() }, { where: { tokenHash, type: 'refresh', revokedAt: null } });
  }

  async revokeAllSessions(userId: number): Promise<void> {
    await Token.update({ revokedAt: new Date() }, { where: { userId, type: 'refresh', revokedAt: null } });
  }

  async getProfile(userId: number): Promise<AuthUserProfile> {
    const user = await User.findByPk(userId, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'manager', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });
    if (!user) throw new ApiError(404, 'user.notFound');
    return publicUserProfile(user);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    if (!isValidPasswordStrength(newPassword)) {
      throw new ApiError(400, 'validation.failed', { newPassword: 'Password must be at least 8 characters and include a number' });
    }
    const user = await User.findOne({ where: { id: userId }, attributes: ['id', 'passwordHash'] });
    if (!user) throw new ApiError(401, 'auth.unauthorized');
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(400, 'auth.oldPasswordIncorrect');
    await user.update({ passwordHash: await hashPassword(newPassword) });
    await this.revokeAllSessions(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ where: { email: email.toLowerCase() }, attributes: ['id', 'email', 'firstName'] });
    if (!user) return;
    const raw = randomToken();
    await Token.create({
      userId: user.id,
      type: 'password_reset',
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const link = `${config.FRONTEND_URL}/reset-password?token=${raw}`;
    await notifyUser({
      userId: user.id,
      type: 'auth.password_reset',
      title: 'Reset your password',
      body: 'Click the link to set a new password. This link expires in 1 hour.',
      link,
      email: { to: user.email, subject: 'PMS password reset', text: `Reset link: ${link}` },
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!isValidPasswordStrength(newPassword)) {
      throw new ApiError(400, 'validation.failed', { newPassword: 'Password must be at least 8 characters and include a number' });
    }
    const tokenHash = hashToken(token);
    const stored = await Token.findOne({
      where: { tokenHash, type: 'password_reset', consumedAt: null, revokedAt: null },
    });
    if (!stored || stored.expiresAt.getTime() < Date.now()) throw new ApiError(400, 'auth.invalidResetToken');
    const user = await User.findByPk(stored.userId);
    if (!user) throw new ApiError(401, 'auth.unauthorized');
    await user.update({ passwordHash: await hashPassword(newPassword) });
    await stored.update({ consumedAt: new Date() });
    await Token.update({ revokedAt: new Date() }, { where: { userId: user.id, type: 'refresh', revokedAt: null } });
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const stored = await Token.findOne({ where: { tokenHash, type: 'email_verification', consumedAt: null } });
    if (!stored || stored.expiresAt.getTime() < Date.now()) throw new ApiError(400, 'auth.invalidResetToken');
    await User.update({ emailVerifiedAt: new Date() }, { where: { id: stored.userId } });
    await stored.update({ consumedAt: new Date() });
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const raw = randomToken();
    await Token.create({
      userId: user.id,
      type: 'email_verification',
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const link = `${config.FRONTEND_URL}/verify-email?token=${raw}`;
    await notifyUser({
      userId: user.id,
      orgId: user.orgId,
      type: 'auth.email_verification',
      title: 'Confirm your email',
      body: 'Verify your email address to activate your account.',
      link,
      email: { to: user.email, subject: 'Confirm your PMS account', text: `Verify link: ${link}` },
    });
  }

  async listByOrg(orgId: number): Promise<User[]> {
    return User.findAll({ where: { orgId }, order: [['firstName', 'ASC']] });
  }
}

export const authService = new AuthService();

export default authService;