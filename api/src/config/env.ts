import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const resolveEnvFile = (): string => {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
};

const boolEnv = (def: boolean) =>
  z.preprocess(
    (v) =>
      v === undefined || v === ''
        ? def
        : typeof v === 'string'
          ? v === 'true' || v === '1'
          : Boolean(v),
    z.boolean(),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(8000),
  APP_URL: z.string().url().default('http://localhost:8000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default(''),
  API_PREFIX: z.string().default('/api/v1'),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1).default('pms'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_LOGGING: boolEnv(false),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('pms-api'),
  JWT_AUDIENCE: z.string().default('pms-web'),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@pms.local'),
  SEED_ADMIN_PASSWORD: z.string().default('ChangeMe123!'),
  SEED_ADMIN_FIRST_NAME: z.string().default('System'),
  SEED_ADMIN_LAST_NAME: z.string().default('Administrator'),
  SEED_ADMIN_LOCALE: z.string().default('en'),
  SEED_ADMIN_TIMEZONE: z.string().default('UTC'),

  MULTI_TENANCY: boolEnv(true),
  DEFAULT_TENANT_NAME: z.string().default('Acme Corporation'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),

  DEFAULT_LOCALE: z.string().default('en'),
  SUPPORTED_LOCALES: z.string().default('en,fr,es,de,hi,zh'),

  LOG_LEVEL: z.string().default('info'),
  LOG_DIR: z.string().default('./logs'),
  ENABLE_METRICS: boolEnv(true),

  REDIS_URL: z.string().optional().default(''),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_SECURE: boolEnv(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('PMS <no-reply@pms.local>'),

  SENTRY_DSN: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error(`Invalid environment configuration\n${JSON.stringify(parsed.error.flatten(), null, 2)}`);
}

export const config = {
  ...parsed.data,
  envFile: resolveEnvFile(),
  supportedLocales: () => parsed.data.SUPPORTED_LOCALES.split(',').map((l) => l.trim()),
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  accessTokenExpiresIn: parsed.data.JWT_ACCESS_EXPIRES_IN,
  refreshTokenExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  corsOrigins: (): string[] =>
    parsed.data.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
} as const;

export type Config = typeof config;

export default config;