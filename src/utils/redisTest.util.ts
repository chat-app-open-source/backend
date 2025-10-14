import logger from '../config/logger';
import { redisClient } from '../config/redis';

export const testRedisConnection = async (): Promise<boolean> => {
  try {
    // Test basic connection
    await redisClient.set('test_connection', 'connected', 10);
    const result = await redisClient.get('test_connection');

    if (result === 'connected') {
      logger.info('✅ Redis connection test successful');
      return true;
    } else {
      logger.error('❌ Redis connection test failed - unexpected result');
      return false;
    }
  } catch (error) {
    logger.error('❌ Redis connection test failed', { error: (error as Error).message });
    return false;
  }
};

export const getRedisInfo = async (): Promise<Record<string, string> | null> => {
  try {
    const info = await redisClient.get('test_info');
    const uptime = process.uptime();

    const redisInfo = {
      status: 'connected',
      uptime: `${Math.floor(uptime / 60)} minutes`,
      timestamp: new Date().toISOString(),
      testKey: info || 'not_set',
    };

    // Set test info
    await redisClient.set('test_info', JSON.stringify(redisInfo), 300); // 5 minutes

    return redisInfo;
  } catch (error) {
    logger.error('Failed to get Redis info', { error: (error as Error).message });
    return null;
  }
};
