/* eslint-disable @typescript-eslint/no-explicit-any */
import admin from 'firebase-admin';
import { getFirebaseMessaging } from '../config/firebase';
import logger from '../config/logger';
import { User } from '../models';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export class PushNotificationService {
  private static messaging = getFirebaseMessaging();

  static async sendToDevice(
    deviceToken: string,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!this.messaging) {
      logger.warn('Firebase Messaging not initialized');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      logger.info('Push notification sent to device', {
        deviceToken: `${deviceToken.substring(0, 10)}...`,
        messageId: response,
      });
      return true;
    } catch (error) {
      logger.error('Failed to send push notification to device', {
        deviceToken: `${deviceToken.substring(0, 10)}...`,
        error: (error as Error).message,
      });

      // Remove invalid token
      if ((error as any).code === 'messaging/registration-token-not-registered') {
        await this.removeInvalidToken(deviceToken);
      }
      return false;
    }
  }

  static async sendToUser(userId: string, payload: PushNotificationPayload): Promise<number> {
    const user = await User.findById(userId);
    if (!user || !user.deviceTokens.length) {
      return 0;
    }

    let successCount = 0;
    const validTokens: string[] = [];

    for (const deviceToken of user.deviceTokens) {
      if (deviceToken.token) {
        const success = await this.sendToDevice(deviceToken.token, payload);
        if (success) {
          successCount++;
          validTokens.push(deviceToken.token);
        }
      }
    }

    // Update user's device tokens (remove invalid ones)
    if (validTokens.length !== user.deviceTokens.length) {
      user.deviceTokens = user.deviceTokens.filter(token => validTokens.includes(token.token));
      await user.save();
    }

    logger.info('Push notifications sent to user', {
      userId,
      successCount,
      totalDevices: user.deviceTokens.length,
    });

    return successCount;
  }

  static async sendToTopic(topic: string, payload: PushNotificationPayload): Promise<boolean> {
    if (!this.messaging) {
      logger.warn('Firebase Messaging not initialized');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        topic: topic.replace(/[^a-zA-Z0-9-_.~%]/g, ''),
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      logger.info('Push notification sent to topic', {
        topic,
        messageId: response,
      });
      return true;
    } catch (error) {
      logger.error('Failed to send push notification to topic', {
        topic,
        error: (error as Error).message,
      });
      return false;
    }
  }

  static async subscribeToTopic(
    userId: string,
    deviceToken: string,
    topic: string,
  ): Promise<boolean> {
    if (!this.messaging) {
      logger.warn('Firebase Messaging not initialized');
      return false;
    }

    try {
      const formattedTopic = topic.replace(/[^a-zA-Z0-9-_.~%]/g, '');
      const response = await this.messaging.subscribeToTopic(deviceToken, formattedTopic);

      if (response.failureCount > 0) {
        logger.warn('Some tokens failed to subscribe to topic', {
          topic: formattedTopic,
          successCount: response.successCount,
          failureCount: response.failureCount,
        });
      } else {
        // Update user's subscribedTopics in the database
        const user = await User.findById(userId);
        if (user && !user.subscribedTopics.includes(formattedTopic)) {
          user.subscribedTopics.push(formattedTopic);
          await user.save();
        }

        logger.info('Device subscribed to topic successfully', {
          topic: formattedTopic,
          userId,
          deviceToken: `${deviceToken.substring(0, 10)}...`,
        });
      }

      return response.failureCount === 0;
    } catch (error) {
      logger.error('Failed to subscribe device to topic', {
        topic,
        userId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  static async unsubscribeFromTopic(
    userId: string,
    deviceToken: string,
    topic: string,
  ): Promise<boolean> {
    if (!this.messaging) {
      logger.warn('Firebase Messaging not initialized');
      return false;
    }

    try {
      const formattedTopic = topic.replace(/[^a-zA-Z0-9-_.~%]/g, '');
      const response = await this.messaging.unsubscribeFromTopic(deviceToken, formattedTopic);

      // Update user's subscribedTopics in the database
      const user = await User.findById(userId);
      if (user && user.subscribedTopics.includes(formattedTopic)) {
        user.subscribedTopics = user.subscribedTopics.filter(t => t !== formattedTopic);
        await user.save();
      }

      logger.info('Device unsubscribed from topic', {
        topic: formattedTopic,
        userId,
        deviceToken: `${deviceToken.substring(0, 10)}...`,
      });

      return response.failureCount === 0;
    } catch (error) {
      logger.error('Failed to unsubscribe device from topic', {
        topic,
        userId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  private static async removeInvalidToken(deviceToken: string): Promise<void> {
    try {
      await User.updateMany(
        { 'deviceTokens.token': deviceToken },
        { $pull: { deviceTokens: { token: deviceToken } } },
      );
      logger.info('Invalid device token removed from users', {
        deviceToken: `${deviceToken.substring(0, 10)}...`,
      });
    } catch (error) {
      logger.error('Failed to remove invalid device token', {
        error: (error as Error).message,
      });
    }
  }

  static async sendToMultipleUsers(
    userIds: string[],
    payload: PushNotificationPayload,
  ): Promise<number> {
    let totalSuccess = 0;

    for (const userId of userIds) {
      const successCount = await this.sendToUser(userId, payload);
      totalSuccess += successCount;
    }

    return totalSuccess;
  }

  static async broadcastToAllUsers(payload: PushNotificationPayload): Promise<boolean> {
    return this.sendToTopic('all_users', payload);
  }

  static async sendToPlatform(
    platform: 'web' | 'android' | 'ios',
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    return this.sendToTopic(`platform_${platform}`, payload);
  }
}
