import cron from 'node-cron';
import { envConfig } from '../config/env';
import logger from '../config/logger';
import { ApiAttempt, LoginAttempt } from '../models';

export const startCleanup = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      // Cleanup ApiAttempt
      const apiCutoffDate = new Date(
        Date.now() - envConfig.apiAttemptRetentionDays * 24 * 60 * 60 * 1000,
      );
      const apiDeleted = await ApiAttempt.deleteMany({
        timestamp: { $lt: apiCutoffDate },
      });
      logger.info(`Cleaned up ${apiDeleted.deletedCount} old API attempts`);

      // Cleanup LoginAttempt
      const loginCutoffDate = new Date(
        Date.now() - envConfig.loginAttemptRetentionDays * 24 * 60 * 60 * 1000,
      );
      const loginDeleted = await LoginAttempt.deleteMany({
        timestamp: { $lt: loginCutoffDate },
      });
      logger.info(`Cleaned up ${loginDeleted.deletedCount} old login attempts`);
    } catch (error) {
      logger.error('Cleanup failed', { error: (error as Error).message });
    }
  });
};
