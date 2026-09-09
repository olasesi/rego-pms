import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { config } from '../../config/env';

export const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: true, // 'draft-7'
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  skip: (req) => req.path === '/health' || req.path === '/metrics',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', key: 'common.badRequest', message: 'Too many requests, please try again later.' },
  },
});

export const authLimiter = rateLimit({
  windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true, // 'draft-7'
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip ?? 'unknown'}:${req.originalUrl}`,
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMITED', key: 'auth.invalidCredentials', message: 'Too many authentication attempts, please try again later.' },
  },
});

export const authSlowDown = slowDown({
  windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  delayAfter: config.AUTH_RATE_LIMIT_MAX,
  delayMs: () => 500,
});

export default { apiLimiter, authLimiter, authSlowDown };