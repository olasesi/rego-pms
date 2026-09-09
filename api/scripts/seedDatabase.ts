import { sequelize } from '../src/config/database';
import { config } from '../src/config/env';
import { log } from '../src/config/logger';
import { seedDatabase } from '../src/seed/index';

async function main(): Promise<void> {
  log.info(`Seeding database '${config.DB_NAME}'...`);
  await sequelize.sync({ alter: false });
  await seedDatabase();
  log.info('Database seed complete.');
  await sequelize.close();
}

main().catch((err) => {
  console.error('Database seed failed:', err);
  process.exit(1);
});