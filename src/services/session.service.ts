import { envConfig } from '../config/env';
import logger from '../config/logger';
import { redisClient } from '../config/redis';
import type { UserSession } from '../types/auth.types';

export class SessionService {
  private static readonly SESSION_TTL = envConfig.sessionTTLDays * 24 * 60 * 60;
  private static readonly INACTIVE_TIMEOUT = envConfig.inactiveSessionTimeoutMinutes * 60 * 1000;

  // Create or update session
  static async createSession(
    sessionData: Omit<UserSession, 'sessionId' | 'createdAt' | 'isActive'>,
  ): Promise<string> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session: UserSession = {
        ...sessionData,
        sessionId,
        createdAt: new Date(),
        isActive: true,
      };

      // Store session in Redis
      await redisClient.set(
        `user_session:${sessionData.userId}:${sessionId}`,
        JSON.stringify(session),
        this.SESSION_TTL,
      );

      // Add to user's active sessions list
      const userSessionsKey = `user_sessions:${sessionData.userId}`;
      const existingSessions = await redisClient.get(userSessionsKey);
      const sessions = existingSessions ? JSON.parse(existingSessions) : [];
      sessions.push(sessionId);

      await redisClient.set(userSessionsKey, JSON.stringify(sessions), this.SESSION_TTL);

      logger.info('Session created', {
        userId: sessionData.userId,
        sessionId,
        deviceType: sessionData.deviceType,
      });
      return sessionId;
    } catch (error) {
      logger.error('Session creation failed', { error: (error as Error).message });
      throw error;
    }
  }

  // Get user's active sessions
  static async getUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const sessionKeys = await redisClient.keys(`user_session:${userId}:*`);

      const sessions: UserSession[] = [];
      for (const key of sessionKeys) {
        const sessionData = await redisClient.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as UserSession;
          session.isActive = this.isSessionActive(session);
          sessions.push(session);
        }
      }

      return sessions.sort(
        (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
      );
    } catch (error) {
      logger.error('Get user sessions failed', { userId, error: (error as Error).message });
      return [];
    }
  }

  // Update session activity
  static async updateSessionActivity(userId: string, sessionId: string): Promise<void> {
    try {
      const key = `user_session:${userId}:${sessionId}`;
      const sessionData = await redisClient.get(key);

      if (sessionData) {
        const session = JSON.parse(sessionData) as UserSession;
        session.lastActivity = new Date();
        session.isActive = true;

        await redisClient.set(key, JSON.stringify(session), this.SESSION_TTL);

        logger.debug('Session activity updated', { userId, sessionId });
      }
    } catch (error) {
      logger.error('Session activity update failed', {
        userId,
        sessionId,
        error: (error as Error).message,
      });
    }
  }

  // Terminate session
  static async terminateSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      await redisClient.del(`user_session:${userId}:${sessionId}`);

      // Remove from user's sessions list
      const userSessionsKey = `user_sessions:${userId}`;
      const existingSessions = await redisClient.get(userSessionsKey);
      if (existingSessions) {
        const sessions = JSON.parse(existingSessions).filter((id: string) => id !== sessionId);
        await redisClient.set(userSessionsKey, JSON.stringify(sessions), this.SESSION_TTL);
      }

      logger.info('Session terminated', { userId, sessionId });
      return true;
    } catch (error) {
      logger.error('Session termination failed', {
        userId,
        sessionId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  // Terminate all sessions except current
  static async terminateOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    try {
      const sessions = await this.getUserSessions(userId);
      let terminatedCount = 0;

      for (const session of sessions) {
        if (session.sessionId !== currentSessionId) {
          await this.terminateSession(userId, session.sessionId);
          terminatedCount++;
        }
      }

      logger.info('Other sessions terminated', { userId, terminatedCount });
      return terminatedCount;
    } catch (error) {
      logger.error('Terminate other sessions failed', { userId, error: (error as Error).message });
      return 0;
    }
  }

  // Cleanup expired sessions
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      // Redis TTL will automatically handle expiration
      const expiredSessionKeys = await redisClient.keys('user_session:*:session_*');
      let cleanedCount = 0;

      for (const key of expiredSessionKeys) {
        const sessionData = await redisClient.get(key);
        if (!sessionData) {
          await redisClient.del(key);
          cleanedCount++;
        }
      }

      logger.info('Session cleanup completed', { cleanedCount });
    } catch (error) {
      logger.error('Session cleanup failed', { error: (error as Error).message });
    }
  }

  // Get session by ID
  static async getSession(userId: string, sessionId: string): Promise<UserSession | null> {
    try {
      const sessionData = await redisClient.get(`user_session:${userId}:${sessionId}`);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData) as UserSession;
      session.isActive = this.isSessionActive(session);
      return session;
    } catch (error) {
      logger.error('Get session failed', { userId, sessionId, error: (error as Error).message });
      return null;
    }
  }

  private static isSessionActive(session: UserSession): boolean {
    return Date.now() - new Date(session.lastActivity).getTime() < this.INACTIVE_TIMEOUT;
  }
}
