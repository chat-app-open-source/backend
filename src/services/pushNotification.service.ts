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
  badge?: number;
  sound?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  platform?: 'android' | 'ios' | 'web';
}

export class PushNotificationService {
  private static messaging = getFirebaseMessaging();

  // Send to specific device
  static async sendToDevice(
    deviceToken: string,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!this.messaging) {
      logger.warn('Firebase Messaging not initialized');
      return false;
    }

    try {
      // Merge data with timestamp and type
      const notificationData = {
        timestamp: new Date().toISOString(),
        ...payload.data, // This will overwrite timestamp if provided in payload.data
      };

      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: notificationData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'chatapp_channel',
            icon: 'ic_notification',
            color: '#2196F3',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              badge: payload.badge || 1,
              sound: payload.sound || 'default',
              'mutable-content': 1,
            },
          },
          fcmOptions: {
            imageUrl: payload.imageUrl,
          },
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            image: payload.imageUrl,
            actions: [
              {
                action: 'view',
                title: 'View',
              },
            ],
          },
        },
      };

      const response = await this.messaging.send(message);
      logger.info('Push notification sent to device', {
        deviceToken: `${deviceToken.substring(0, 10)}...`,
        messageId: response,
        title: payload.title,
      });
      return true;
    } catch (error) {
      logger.error('Failed to send push notification to device', {
        deviceToken: `${deviceToken.substring(0, 10)}...`,
        error: (error as Error).message,
        code: (error as any).code,
      });

      // Remove invalid token
      if ((error as any).code === 'messaging/registration-token-not-registered') {
        await this.removeInvalidToken(deviceToken);
      }
      return false;
    }
  }

  // Send to user (all devices)
  static async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<{
    successCount: number;
    totalDevices: number;
    results: Array<{ deviceToken: string; success: boolean; error?: string }>;
  }> {
    const user = await User.findById(userId);
    if (!user || !user.deviceTokens.length) {
      return {
        successCount: 0,
        totalDevices: 0,
        results: [],
      };
    }

    let successCount = 0;
    const validTokens: string[] = [];
    const results: Array<{ deviceToken: string; success: boolean; error?: string }> = [];

    for (const deviceToken of user.deviceTokens) {
      if (deviceToken.token) {
        try {
          const success = await this.sendToDevice(deviceToken.token, payload);
          results.push({
            deviceToken: deviceToken.token,
            success,
            error: success ? undefined : 'Failed to send notification',
          });

          if (success) {
            successCount++;
            validTokens.push(deviceToken.token);
          }
        } catch (error: any) {
          results.push({
            deviceToken: deviceToken.token,
            success: false,
            error: error.message,
          });
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
      title: payload.title,
    });

    return {
      successCount,
      totalDevices: user.deviceTokens.length,
      results,
    };
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
        data: payload.data || {},
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              badge: payload.badge || 1,
              sound: payload.sound || 'default',
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      logger.info('Push notification sent to topic', {
        topic,
        messageId: response,
        title: payload.title,
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

  // Enhanced notification methods with proper data structure
  static async sendNewMessageNotification(
    userId: string,
    conversationName: string,
    messagePreview: string,
    data: {
      conversationId: string;
      messageId: string;
      senderId: string;
      senderName: string;
      messageType: string;
    },
  ): Promise<{ successCount: number; totalDevices: number }> {
    const payload: PushNotificationPayload = {
      title: conversationName,
      body: messagePreview,
      data: {
        notificationType: 'new_message',
        conversationId: data.conversationId,
        messageId: data.messageId,
        senderId: data.senderId,
        senderName: data.senderName,
        messageType: data.messageType,
      },
      badge: 1,
      sound: 'message.wav',
    };

    const result = await this.sendToUser(userId, payload);
    return {
      successCount: result.successCount,
      totalDevices: result.totalDevices,
    };
  }

  static async sendCallNotification(
    userId: string,
    callerName: string,
    callType: 'audio' | 'video',
    data: {
      callId: string;
      conversationId?: string;
      meetingId?: string;
    },
  ): Promise<{ successCount: number; totalDevices: number }> {
    const payload: PushNotificationPayload = {
      title: `Incoming ${callType} call`,
      body: `${callerName} is calling you`,
      data: {
        notificationType: 'incoming_call',
        callType,
        callId: data.callId,
        ...(data.conversationId && { conversationId: data.conversationId }),
        ...(data.meetingId && { meetingId: data.meetingId }),
      },
      badge: 1,
      sound: 'ringtone.wav',
    };

    const result = await this.sendToUser(userId, payload);
    return {
      successCount: result.successCount,
      totalDevices: result.totalDevices,
    };
  }

  static async sendSecurityNotification(
    userId: string,
    title: string,
    message: string,
    data: {
      alertType: 'login_alert' | 'password_change' | 'new_device' | 'suspicious_activity';
      ip?: string;
      device?: string;
      location?: string;
    },
  ): Promise<{ successCount: number; totalDevices: number }> {
    const payload: PushNotificationPayload = {
      title,
      body: message,
      data: {
        notificationType: 'security_alert',
        alertType: data.alertType,
        ...(data.ip && { ip: data.ip }),
        ...(data.device && { device: data.device }),
        ...(data.location && { location: data.location }),
      },
      badge: 1,
      sound: 'alert.wav',
    };

    const result = await this.sendToUser(userId, payload);
    return {
      successCount: result.successCount,
      totalDevices: result.totalDevices,
    };
  }

  // Send meeting notification
  static async sendMeetingNotification(
    userId: string,
    title: string,
    message: string,
    data: {
      meetingId: string;
      roomId: string;
      action: 'created' | 'starting' | 'updated' | 'cancelled';
    },
  ): Promise<{ successCount: number; totalDevices: number }> {
    const payload: PushNotificationPayload = {
      title,
      body: message,
      data: {
        notificationType: 'meeting',
        meetingId: data.meetingId,
        roomId: data.roomId,
        action: data.action,
      },
      badge: 1,
      sound: 'meeting.wav',
    };

    const result = await this.sendToUser(userId, payload);
    return {
      successCount: result.successCount,
      totalDevices: result.totalDevices,
    };
  }

  // Send story notification
  static async sendStoryNotification(
    userId: string,
    userName: string,
    data: {
      storyId: string;
      action: 'created' | 'viewed';
    },
  ): Promise<{ successCount: number; totalDevices: number }> {
    const title = data.action === 'created' ? 'New Story' : 'Story Viewed';
    const body =
      data.action === 'created'
        ? `${userName} posted a new story`
        : `${userName} viewed your story`;

    const payload: PushNotificationPayload = {
      title,
      body,
      data: {
        notificationType: 'story',
        storyId: data.storyId,
        action: data.action,
      },
      badge: 1,
      sound: 'story.wav',
    };

    const result = await this.sendToUser(userId, payload);
    return {
      successCount: result.successCount,
      totalDevices: result.totalDevices,
    };
  }

  // Subscribe device to topic
  static async subscribeToTopic(
    userId: string,
    deviceToken: string,
    topic: string,
  ): Promise<boolean> {
    try {
      if (!this.messaging) {
        logger.warn('Firebase Messaging not initialized');
        return false;
      }

      const sanitizedTopic = topic.replace(/[^a-zA-Z0-9-_.~%]/g, '');
      const response = await this.messaging.subscribeToTopic([deviceToken], sanitizedTopic);

      if (response.failureCount > 0) {
        logger.warn('Some tokens failed to subscribe to topic', {
          topic: sanitizedTopic,
          successCount: response.successCount,
          failureCount: response.failureCount,
          errors: response.errors,
        });
      } else {
        // Update user's subscribedTopics in the database
        const user = await User.findById(userId);
        if (user && !user.subscribedTopics.includes(sanitizedTopic)) {
          user.subscribedTopics.push(sanitizedTopic);
          await user.save();
        }

        logger.info('Device subscribed to topic successfully', {
          topic: sanitizedTopic,
          userId,
          deviceToken: `${deviceToken.substring(0, 10)}...`,
        });
      }

      return response.failureCount === 0;
    } catch (error: any) {
      logger.error('Failed to subscribe device to topic', {
        topic,
        userId,
        error: error.message,
      });
      return false;
    }
  }

  // Unsubscribe device from topic
  static async unsubscribeFromTopic(
    userId: string,
    deviceToken: string,
    topic: string,
  ): Promise<boolean> {
    try {
      if (!this.messaging) {
        logger.warn('Firebase Messaging not initialized');
        return false;
      }

      const sanitizedTopic = topic.replace(/[^a-zA-Z0-9-_.~%]/g, '');
      const response = await this.messaging.unsubscribeFromTopic([deviceToken], sanitizedTopic);

      // Update user's subscribedTopics in the database
      const user = await User.findById(userId);
      if (user && user.subscribedTopics.includes(sanitizedTopic)) {
        user.subscribedTopics = user.subscribedTopics.filter(t => t !== sanitizedTopic);
        await user.save();
      }

      logger.info('Device unsubscribed from topic', {
        topic: sanitizedTopic,
        userId,
        deviceToken: `${deviceToken.substring(0, 10)}...`,
      });

      return response.failureCount === 0;
    } catch (error: any) {
      logger.error('Failed to unsubscribe device from topic', {
        topic,
        userId,
        error: error.message,
      });
      return false;
    }
  }

  // Send to multiple users
  static async sendToMultipleUsers(
    userIds: string[],
    payload: PushNotificationPayload,
  ): Promise<{
    totalSuccess: number;
    totalFailure: number;
    totalDevices: number;
    userResults: Array<{
      userId: string;
      successCount: number;
      totalDevices: number;
      error?: string;
    }>;
  }> {
    const userResults: Array<{
      userId: string;
      successCount: number;
      totalDevices: number;
      error?: string;
    }> = [];
    let totalSuccess = 0;
    let totalFailure = 0;
    let totalDevices = 0;

    for (const userId of userIds) {
      try {
        const result = await this.sendToUser(userId, payload);

        userResults.push({
          userId,
          successCount: result.successCount,
          totalDevices: result.totalDevices,
        });

        totalSuccess += result.successCount;
        totalDevices += result.totalDevices;

        if (result.successCount === 0) {
          totalFailure++;
        }
      } catch (error: any) {
        userResults.push({
          userId,
          successCount: 0,
          totalDevices: 0,
          error: error.message,
        });
        totalFailure++;
      }
    }

    logger.info('Batch push notifications completed', {
      totalUsers: userIds.length,
      totalSuccess,
      totalFailure,
      totalDevices,
    });

    return {
      totalSuccess,
      totalFailure,
      totalDevices,
      userResults,
    };
  }

  // Broadcast to all users
  static async broadcastToAllUsers(payload: PushNotificationPayload): Promise<boolean> {
    return this.sendToTopic('all_users', payload);
  }

  // Send to platform-specific topic
  static async sendToPlatform(
    platform: 'web' | 'android' | 'ios',
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    return this.sendToTopic(`platform_${platform}`, payload);
  }

  // Remove invalid device token
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

  // Get notification statistics
  static async getNotificationStats(userId: string): Promise<{
    totalDevices: number;
    validDevices: number;
    subscribedTopics: string[];
    lastNotification?: Date;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        totalDevices: user.deviceTokens.length,
        validDevices: user.deviceTokens.filter(t => t.token).length,
        subscribedTopics: user.subscribedTopics,
        lastNotification:
          user.deviceTokens.length > 0
            ? new Date(Math.max(...user.deviceTokens.map(t => t.createdAt.getTime())))
            : undefined,
      };
    } catch (error: any) {
      logger.error('Failed to get notification stats', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  // Clean up invalid device tokens
  static async cleanupInvalidTokens(): Promise<{ removedCount: number }> {
    try {
      // This would typically be called by a cron job
      // In a real implementation, you might want to check token validity
      // with Firebase Admin SDK or remove tokens that haven't been used in a long time

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await User.updateMany(
        {
          deviceTokens: {
            $elemMatch: {
              createdAt: { $lt: thirtyDaysAgo },
            },
          },
        },
        {
          $pull: {
            deviceTokens: {
              createdAt: { $lt: thirtyDaysAgo },
            },
          },
        },
      );

      logger.info('Cleaned up old device tokens', {
        modifiedCount: result.modifiedCount,
      });

      return {
        removedCount: result.modifiedCount || 0,
      };
    } catch (error: any) {
      logger.error('Failed to cleanup invalid tokens', {
        error: error.message,
      });
      return { removedCount: 0 };
    }
  }

  // Test notification delivery
  static async testNotification(
    userId: string,
    deviceToken?: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const testPayload: PushNotificationPayload = {
        title: 'Test Notification',
        body: 'This is a test notification from ChatApp',
        data: {
          notificationType: 'test',
          timestamp: new Date().toISOString(),
        },
        badge: 1,
        sound: 'default',
      };

      if (deviceToken) {
        const success = await this.sendToDevice(deviceToken, testPayload);
        return {
          success,
          message: success
            ? 'Test notification sent successfully'
            : 'Failed to send test notification',
        };
      } else {
        const result = await this.sendToUser(userId, testPayload);
        return {
          success: result.successCount > 0,
          message: `Test notifications sent to ${result.successCount} out of ${result.totalDevices} devices`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
