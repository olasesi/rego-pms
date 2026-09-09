import { sequelize } from '../src/config/database';
import { config } from '../src/config/env';
import { log } from '../src/config/logger';

async function main(): Promise<void> {
  log.info(`Syncing database '${config.DB_NAME}' (sync: true, alter: false)...`);
  await sequelize.sync({ alter: false });
  log.info('Database sync complete.');
  await sequelize.close();
}

main().catch((err) => {
  console.error('Database sync failed:', err);
  process.exit(1);
});