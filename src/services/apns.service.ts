import apn from 'apn';
import { envConfig } from '../config/env';
import logger from '../config/logger';

export interface APNSNotification {
  deviceToken: string;
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  data?: Record<string, string>;
  category?: string;
}

export class APNSService {
  private static provider: apn.Provider | null = null;
  private static isInitialized = false;

  static initialize(): void {
    try {
      if (
        !envConfig.apnsKeyId ||
        !envConfig.apnsTeamId ||
        !envConfig.apnsBundleId ||
        !envConfig.apnsKey
      ) {
        logger.warn('APNS configuration missing. iOS push notifications disabled.');
        return;
      }

      this.provider = new apn.Provider({
        token: {
          key: Buffer.from(envConfig.apnsKey),
          keyId: envConfig.apnsKeyId,
          teamId: envConfig.apnsTeamId,
        },
        production: envConfig.nodeEnv === 'prod',
      });

      this.isInitialized = true;
      logger.info('✅ APNS provider initialized successfully');
    } catch (error) {
      logger.error('❌ APNS initialization failed', { error: (error as Error).message });
    }
  }

  static async sendNotification(notification: APNSNotification): Promise<boolean> {
    if (!this.isInitialized || !this.provider) {
      logger.warn('APNS not initialized');
      return false;
    }

    try {
      const {
        deviceToken,
        title,
        body,
        badge = 1,
        sound = 'default',
        data,
        category,
      } = notification;

      const apnNotification = new apn.Notification({
        topic: envConfig.apnsBundleId,
        badge,
        sound,
        category,
        alert: {
          title,
          body,
        },
        payload: {
          ...data,
          aps: {
            'content-available': 1,
          },
        },
        expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        priority: 10,
      });

      const result = await this.provider.send(apnNotification, deviceToken);

      if (result.failed.length > 0) {
        logger.error('APNS notification failed', {
          deviceToken: `${deviceToken.substring(0, 10)}...`,
          failures: result.failed,
        });
        return false;
      }

      logger.info('APNS notification sent successfully', {
        deviceToken: `${deviceToken.substring(0, 10)}...`,
        sent: result.sent.length,
      });
      return true;
    } catch (error) {
      logger.error('APNS notification error', {
        error: (error as Error).message,
        deviceToken: `${notification.deviceToken.substring(0, 10)}...`,
      });
      return false;
    }
  }

  static async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      this.isInitialized = false;
      logger.info('APNS provider shutdown');
    }
  }
}

// Initialize on module load
APNSService.initialize();
