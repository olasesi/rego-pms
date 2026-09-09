import { Sequelize } from 'sequelize';
import { config } from './env';
import { logger } from './logger';

export const sequelize = new Sequelize(config.DB_NAME, config.DB_USER, config.DB_PASSWORD, {
  host: config.DB_HOST,
  port: config.DB_PORT,
  dialect: 'mysql',
  logging: config.isDevelopment && config.DB_LOGGING ? (msg) => logger.debug(String(msg)) : false,
  timezone: '+00:00',
  define: {
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: true,
    paranoid: false,
  },
  dialectOptions: {
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: false,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30_000,
    idle: 10_000,
  },
  benchmark: true,
});

export interface DbConnectionOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export async function testConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established.');
  } catch (err) {
    logger.error('Unable to connect to the database:', err as Error);
    throw err;
  }
}

export async function connectDatabase(options: DbConnectionOptions = {}): Promise<void> {
  const { maxRetries = 5, retryDelayMs = 3000 } = options;
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      await sequelize.authenticate();
      logger.info('Database connection established.');
      return;
    } catch (err) {
      if (attempt >= maxRetries) {
        logger.error(`Database connection failed after ${attempt} attempts.`, err as Error);
        throw err;
      }
      logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed, retrying in ${retryDelayMs}ms...`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
}

export default sequelize;