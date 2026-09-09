import cron from 'node-cron';
import { config } from '../config/env';
import { log } from '../config/logger';
import { runReviewReminders } from './reviewReminders';
import { runGoalDigest } from './goalDigest';

interface ScheduledJob {
  name: string;
  cron: string;
  run: () => Promise<void>;
}

const jobs: ScheduledJob[] = [
  {
    name: 'review-reminders',
    cron: '0 9,15 * * 1-5',
    run: runReviewReminders,
  },
  {
    name: 'goal-checkin-digest',
    cron: '0 11 * * 1',
    run: runGoalDigest,
  },
];

export function startJobs(): void {
  if (config.isTest) {
    log.info('[jobs] scheduler disabled in test environment');
    return;
  }
  for (const job of jobs) {
    const task = cron.schedule(job.cron, () => {
      job.run().catch((err: Error) => log.error(`[job:${job.name}] failed`, { error: err.message }));
    });
    task.start();
    log.info(`[jobs] scheduled '${job.name}' at '${job.cron}'`);
  }
}

export default startJobs;