import { sequelize, connectDatabase } from './config/database';
import { initI18n } from './config/i18n';
import { seedDatabase } from './seed';
import { config } from './config/env';
import { log } from './config/logger';

export interface InitDatabaseOptions {
  sync?: boolean;
  alter?: boolean;
}

export async function initDatabase(options: InitDatabaseOptions = { sync: true, alter: false }): Promise<void> {
  await initI18n();
  await connectDatabase();

  if (options.sync === true) {
    const alter = options.alter === true && config.isDevelopment;
    await sequelize.sync({ alter });
    log.info('[db] schema synchronized');
  }
  await seedDatabase();
}

export async function syncDatabase(): Promise<void> {
  await connectDatabase();
  await sequelize.sync({ alter: config.isDevelopment });
  log.info('[db] schema synchronized');
}

export default { initDatabase, syncDatabase };