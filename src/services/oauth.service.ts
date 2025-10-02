import mongoose from 'mongoose';

import { logger } from '../config';
import type { IUserDocument } from '../models';
import { LoginAttempt, User } from '../models';
import type { IAuthTokens, IOAuthUser } from '../types';

import { sendEmail } from './email.service';

const MINUTE_MS = 60 * 1000;
const SUCCESS_LOGIN_THRESHOLD = 10;

const logLoginAttempt = async (
  email: string,
  ip: string,
  userAgent: string | undefined,
  success: boolean,
  userId?: string,
): Promise<void> => {
  try {
    const attempt = new LoginAttempt({
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      email,
      ip,
      userAgent,
      success,
      timestamp: new Date(),
    });
    await attempt.save();
    logger.debug('OAuth login attempt logged', { email, success, ip });
  } catch (error) {
    logger.error('Failed to log OAuth login attempt', {
      email,
      success,
      ip,
      error: (error as Error).message,
    });
  }
};

const lockUser = async (
  user: IUserDocument,
  reason: 'excessive_successful_logins',
): Promise<void> => {
  try {
    const baseMinutes = 20;
    user.isLocked = true;
    user.lockUntil = new Date(Date.now() + baseMinutes * MINUTE_MS);
    user.lockReason = reason;
    user.lockCount = (user.lockCount || 0) + 1;
    await user.save();

    const unlockTime = user.lockUntil.toLocaleString();
    const duration = baseMinutes;

    await sendEmail({
      to: user.email,
      subject: 'ChatApp Account Locked - Suspicious Activity Detected',
      template: 'accountLocked',
      context: {
        username: user.username,
        email: user.email,
        reason: 'too many successful logins in a short time',
        unlockTime,
        duration,
        lockCount: user.lockCount,
        isExtended: false,
        currentYear: new Date().getFullYear(),
      },
    });

    logger.warn('Account locked', {
      userId: user._id,
      email: user.email,
      reason,
      duration,
      lockCount: user.lockCount,
    });
  } catch (error) {
    logger.error('Failed to lock user account via OAuth', {
      userId: user._id,
      email: user.email,
      reason,
      error: (error as Error).message,
    });
    throw error;
  }
};

export const handleOAuthLogin = async (
  provider: 'google' | 'facebook',
  oauthUser: IOAuthUser,
  ip: string,
  userAgent: string | undefined,
): Promise<{ user: IUserDocument; tokens: IAuthTokens }> => {
  try {
    let user = await User.findOne({
      oauthProvider: provider,
      oauthId: oauthUser.oauthId,
    }).select('-password');

    if (!user) {
      // Check if email exists with a different provider or no provider
      user = await User.findOne({ email: oauthUser.email }).select('-password');
      if (user) {
        // Update existing user with OAuth details
        user.oauthProvider = provider;
        user.oauthId = oauthUser.oauthId;
        user.profilePicture = oauthUser.profilePicture || user.profilePicture;
        user.isVerified = true;
        await user.save();
        logger.info('Existing user updated with OAuth credentials', {
          userId: user._id,
          email: user.email,
          provider,
        });
      } else {
        // Create new user
        user = new User({
          email: oauthUser.email,
          username: `${oauthUser.email.split('@')[0]}${Math.random().toString(36).slice(-4)}`,
          firstName: oauthUser.firstName,
          lastName: oauthUser.lastName,
          profilePicture: oauthUser.profilePicture || '',
          oauthProvider: provider,
          oauthId: oauthUser.oauthId,
          isVerified: true,
          status: 'online',
          lastSeen: new Date(),
        });
        await user.save();
        logger.info('New OAuth user created', {
          userId: user._id,
          email: user.email,
          provider,
        });
      }
    }

    if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
      // For OAuth, if locked, throw without extending, as no password to brute
      throw new Error(
        `Account is locked until ${user.lockUntil.toLocaleString()}. Check your email for details.`,
      );
    }

    await logLoginAttempt(user.email, ip, userAgent, true, user.id.toString());
    const successCount = await LoginAttempt.countDocuments({
      userId: user._id,
      success: true,
      timestamp: { $gt: new Date(Date.now() - MINUTE_MS) },
    });
    if (successCount >= SUCCESS_LOGIN_THRESHOLD) {
      await lockUser(user, 'excessive_successful_logins');
      throw new Error(
        `Account locked due to too many successful logins in short time. Check your email.`,
      );
    }

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    const { generateTokens } = await import('./token.service');
    const tokens = await generateTokens(user.id.toString());

    logger.info(`${provider} OAuth login successful`, {
      userId: user._id,
      email: user.email,
      username: user.username,
    });
    return { user, tokens };
  } catch (error) {
    logger.error(`${provider} OAuth login failed`, {
      error: (error as Error).message,
      oauthId: oauthUser.oauthId,
      email: oauthUser.email,
    });
    throw error;
  }
};
