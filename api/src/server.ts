import http from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { log } from './config/logger';
import { sequelize } from './config/database';
import { disposeRedis } from './config/redis';
import { initDatabase } from './bootstrap';
import { startJobs } from './jobs';

export const bootstrap = async (): Promise<http.Server> => {
  await initDatabase({ sync: true, alter: false });
  const server = createApp().listen(config.PORT, config.HOST, () => {
    log.info(`PMS API listening on http://${config.HOST}:${config.PORT}`);
    log.info(`Database ${config.DB_NAME} ready, documentation at http://localhost:${config.PORT}/docs`);
  });

  return server;
};

const serverShutdown = (server: http.Server, code = 0): void => {
  log.info('Shutting down gracefully...');
  server.close(async () => {
    try {
      await Promise.all([sequelize.close(), disposeRedis()]);
      log.info('Shutdown complete');
      process.exit(code);
    } catch (err) {
      log.error('Error during shutdown', { error: (err as Error).message });
      process.exit(code);
    }
  });
  setTimeout(() => process.exit(code), 15_000).unref();
};

async function start(): Promise<void> {
  if (config.NODE_ENV === 'test') {
    log.warn('[server] not starting server in test environment');
    return;
  }
  const server = await bootstrap();
  if (config.isProduction) {
    startJobs();
  }

  const onShutdown = (code: number): void => serverShutdown(server, code);

  process.on('SIGTERM', () => onShutdown(0));
  process.on('SIGINT', () => onShutdown(0));
  process.on('uncaughtException', (err) => {
    log.error('Uncaught exception', { error: err.message, stack: err.stack });
  });
  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled rejection', { error: String(reason) });
  });
}

if (require.main === module) {
  start().catch((err) => {
    log.error('[server] failed to start', { error: (err as Error).message, stack: (err as Error).stack });
    process.exit(1);
  });
}

export { start }; 