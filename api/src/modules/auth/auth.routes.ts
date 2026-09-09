import { Router } from 'express';
import type { Request } from 'express';
import { z } from 'zod';
import { authenticate } from '../../common/middleware/authenticate';
import { validate } from '../../common/middleware/validate';
import { authLimiter, authSlowDown } from '../../common/middleware/rateLimiter';
import { asyncHandler, sendOk } from '../../common/utils/responses';
import { authService } from './auth.service';

const router = Router();

const getClientMeta = (req: Request): { ip: string | null; userAgent: string | null } => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  title: z.string().trim().max(140).optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(60).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

const tokenSchema = z.object({
  refreshToken: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(255),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

router.post('/register', authLimiter, authSlowDown, validate(registerSchema), asyncHandler(async (req, res) => {
  const { ip, userAgent } = getClientMeta(req);
  const user = await authService.register(req.body, ip, userAgent);
  return res.status(201).json({ success: true, data: user });
}));

router.post('/login', authLimiter, authSlowDown, validate(loginSchema), asyncHandler(async (req, res) => {
  const { ip, userAgent } = getClientMeta(req);
  const result = await authService.login(req.body.email, req.body.password, ip, userAgent);
  return sendOk(res, result);
}));

router.post('/refresh', authLimiter, validate(tokenSchema), asyncHandler(async (req, res) => {
  const { ip, userAgent } = getClientMeta(req);
  const result = await authService.refresh(req.body.refreshToken, ip, userAgent);
  return sendOk(res, result);
}));

router.post('/logout', validate(tokenSchema), asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  return sendOk(res, { success: true }, undefined, 'Signed out');
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user!.id);
  return sendOk(res, profile);
}));

router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(async (req, res) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  return sendOk(res, { success: true }, undefined, 'Password changed');
}));

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  return sendOk(res, { success: true }, undefined, 'If this email exists, a reset link was sent');
}));

router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  return sendOk(res, { success: true }, undefined, 'Password reset');
}));

router.post('/verify-email', validate(verifyEmailSchema), asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  return sendOk(res, { success: true }, undefined, 'Email verified');
}));

router.post('/sessions/revoke-all', authenticate, asyncHandler(async (req, res) => {
  await authService.revokeAllSessions(req.user!.id);
  return sendOk(res, { success: true }, undefined, 'All sessions revoked');
}));

export default router;