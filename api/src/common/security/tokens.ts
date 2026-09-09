import crypto from 'crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { config } from '../../config/env';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  orgId: number | null;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: 'refresh';
}

const toExpiry = (value: string): SignOptions['expiresIn'] => value as SignOptions['expiresIn'];

export const signAccessToken = (userId: number, orgId: number | null, email: string): string =>
  jwt.sign({ orgId, email, type: 'access' } as AccessTokenPayload, config.JWT_ACCESS_SECRET, {
    subject: String(userId),
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    expiresIn: toExpiry(config.accessTokenExpiresIn),
  });

export const signRefreshToken = (userId: number): string =>
  jwt.sign({ type: 'refresh' } as RefreshTokenPayload, config.JWT_REFRESH_SECRET, {
    subject: String(userId),
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    expiresIn: toExpiry(config.refreshTokenExpiresIn),
  });

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET, {
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    }) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET, {
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    }) as RefreshTokenPayload;
  } catch {
    return null;
  }
}

export const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

export const randomToken = (bytes = 48): string => crypto.randomBytes(bytes).toString('base64url');

export const hashToken = sha256;