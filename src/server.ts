import http from 'http'; // or https for secure
import app from './config/app';
import { envConfig } from './config/env';
import { initializeFirebase } from './config/firebase';
import logger from './config/logger';
import { connectDB, disconnectDB } from './config/mongodb';
import { redisClient } from './config/redis';
import { APNSService, SessionService, SocketService } from './services';
import { getApiEndpointsInfo, logAvailableEndpoints, startCleanup } from './utils';

const server = http.createServer(app);

// Initialize SocketService
const socketService = new SocketService(server);

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    socketService.getIO().close();
    await APNSService.shutdown();
    if (redisClient.getConnectionStatus()) {
      await redisClient.quit();
    }
    await disconnectDB();
  } catch (error) {
    logger.error('Error during SIGTERM shutdown', { error: (error as Error).message });
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  try {
    socketService.getIO().close();
    await APNSService.shutdown();
    if (redisClient.getConnectionStatus()) {
      await redisClient.quit();
    }
    await disconnectDB();
  } catch (error) {
    logger.error('Error during SIGINT shutdown', { error: (error as Error).message });
  }
  process.exit(0);
});

// ==================== START SERVER ====================

const PORT = envConfig.port;

const startServer = async (): Promise<void> => {
  try {
    logger.info('🔄 Starting ChatApp Backend...');

    // Log endpoints after logger is fully initialized
    logAvailableEndpoints(logger);

    // Connect to MongoDB
    await connectDB();
    logger.info('📚 MongoDB connected successfully');

    // Initialize Firebase
    initializeFirebase();
    logger.info('🔥 Firebase initialization attempted');
    const redisConnected = await redisClient.waitForConnection(15000);

    if (!redisConnected) {
      logger.warn('⚠️ Redis connection timeout - Starting server without Redis');
      logger.warn('Some features may not work properly (2FA, Rate Limiting, Sessions)');
    } else {
      try {
        await redisClient.ping();
        logger.info('✅ Redis connection test successful');
      } catch (_error) {
        logger.warn('⚠️ Redis ping test failed, but continuing startup');
      }
    }

    // Initialize APNS
    APNSService.initialize();
    logger.info('📱 APNS initialization attempted');

    // Start cleanup cron job
    startCleanup();
    logger.info('🧹 Cleanup cron job started');

    // Start session cleanup cron (only if Redis is connected)
    if (redisConnected) {
      setInterval(
        () => {
          SessionService.cleanupExpiredSessions();
        },
        24 * 60 * 60 * 1000,
      ); // Run every 24 hours
      logger.info('👥 Session cleanup service started');
    }

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📧 Client URL: ${envConfig.clientUrl}`);
      logger.info(`🔐 Environment: ${envConfig.nodeEnv}`);
      logger.info(`🛡️ API Key protection: Enabled with rate limiting`);
      logger.info(`🛒 Redis: ${redisConnected ? 'Connected' : 'Disconnected'}`);
      logger.info(`📱 APNS: ${APNSService ? 'Initialized' : 'Disabled'}`);
      logger.info(`🛡️ Total API Endpoints: ${Object.keys(getApiEndpointsInfo()).length}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
};

startServer();
