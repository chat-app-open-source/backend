/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { z } from 'zod';

import logger from '../config/logger';
import { LoginAttempt, OTP, RefreshToken, User } from '../models';
import { forgotPasswordSchema, loginSchema, registerSchema } from '../schemas';
import type { IAuthTokens, IUserDocument } from '../types';
import { sendEmail } from './email.service';
import { E2EEncryptionService } from './encryption.service';
import { checkOTPStatus, generateOTP, resendOTP, storeOTP, verifyOTP } from './otp.service';
import { PushNotificationService } from './pushNotification.service';
import { WebAuthnService } from './webauthn.service';

const MINUTE_MS = 60 * 1000;
const FAILED_ATTEMPT_THRESHOLD = 5;
const SUCCESS_LOGIN_THRESHOLD = 10;

export const registerUser = async (
  data: z.infer<typeof registerSchema>,
): Promise<{ user: IUserDocument; otpSent: boolean }> => {
  try {
    const validatedData = registerSchema.parse(data);

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email: validatedData.email }, { username: validatedData.username }],
    });

    if (existingUser) {
      throw new Error(
        existingUser.email === validatedData.email
          ? 'Email already exists'
          : 'Username already exists',
      );
    }

    // Generate E2E encryption keys for new user
    let publicKey = '';
    let encryptedPrivateKey = '';
    let keySalt = '';

    try {
      const { publicKey: generatedPublicKey, privateKey } =
        await E2EEncryptionService.generateKeyPair();
      const { encrypted, salt } = await E2EEncryptionService.encryptPrivateKey(
        privateKey,
        validatedData.password,
      );

      publicKey = generatedPublicKey;
      encryptedPrivateKey = encrypted;
      keySalt = salt;

      logger.info('E2E encryption keys generated successfully', {
        email: validatedData.email,
      });
    } catch (encryptionError) {
      logger.warn('E2E encryption failed, proceeding without encryption', {
        email: validatedData.email,
        error: (encryptionError as Error).message,
      });
      // Continue without encryption keys - user can set them up later
    }

    // Create user document
    const userData: any = {
      email: validatedData.email,
      password: validatedData.password,
      username: validatedData.username,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phoneNumber: validatedData.phoneNumber,
      dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
      gender: validatedData.gender,
      language: validatedData.language || 'en',
      country: validatedData.country,
      isVerified: false,
    };

    // Only add encryption fields if they were successfully generated
    if (publicKey && encryptedPrivateKey && keySalt) {
      userData.publicKey = publicKey;
      userData.privateKeyEncrypted = encryptedPrivateKey;
      userData.keySalt = keySalt;
    }

    // Add device tokens if provided
    if (validatedData.deviceToken && validatedData.platform) {
      userData.deviceTokens = [
        {
          token: validatedData.deviceToken,
          platform: validatedData.platform,
          createdAt: new Date(),
        },
      ];
      userData.subscribedTopics = [`platform_${validatedData.platform}`, 'all_users'];
    } else {
      userData.subscribedTopics = ['all_users'];
    }

    const user = new User(userData);
    await user.save();

    // Generate and store OTP for email verification
    const otp = generateOTP();
    await storeOTP(validatedData.email, otp, 'email_verification');

    // Send verification email
    try {
      await sendEmail({
        to: validatedData.email,
        subject: 'Verify Your Email - Chat App',
        template: 'verifyEmail',
        context: {
          otp,
          userName: validatedData.username,
          expiry: '10 minutes',
          title: 'Email Verification',
          subtitle: 'Secure your ChatApp account',
          currentYear: new Date().getFullYear(),
        },
      });

      logger.info('Verification email sent successfully', {
        userId: user._id,
        email: validatedData.email,
      });
    } catch (emailError) {
      logger.error('Failed to send verification email', {
        userId: user._id,
        error: (emailError as Error).message,
      });
    }

    // Send welcome notification if device token is provided
    if (validatedData.deviceToken && validatedData.platform) {
      try {
        await PushNotificationService.sendToDevice(validatedData.deviceToken, {
          title: 'Welcome to ChatApp!',
          body: `Hello ${validatedData.username}, welcome to ChatApp! Verify your email to get started.`,
          data: {
            type: 'welcome',
            userId: user._id.toString(),
          },
        });

        logger.info('Welcome notification sent', {
          userId: user._id,
          deviceToken: `${validatedData.deviceToken.substring(0, 10)}...`,
        });
      } catch (notificationError) {
        logger.error('Failed to send welcome notification', {
          userId: user._id,
          error: (notificationError as Error).message,
        });
      }
    }

    logger.info('User registered successfully', {
      userId: user._id,
      email: validatedData.email,
      username: validatedData.username,
      hasEncryption: !!publicKey,
    });

    return {
      user,
      otpSent: true,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `Validation error: ${error.issues[0].message}`;
      logger.error('Registration validation failed', {
        errors: error.issues,
        inputData: {
          email: data.email,
          username: data.username,
          // Don't log password
        },
      });
      throw new Error(errorMessage);
    }

    logger.error('Registration failed', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      inputData: {
        email: data.email,
        username: data.username,
      },
    });

    throw error;
  }
};

export const verifyEmailOTP = async (email: string, otp: string): Promise<IUserDocument> => {
  const isValid = await verifyOTP(email, otp, 'email_verification');
  if (!isValid) {
    throw new Error('Invalid or expired OTP');
  }

  const user = await User.findOneAndUpdate(
    { email },
    { isVerified: true },
    { new: true, select: '-password' },
  );

  if (!user) {
    throw new Error('User not found');
  }

  // Clean up used OTP
  await OTP.deleteOne({ email, type: 'email_verification' });

  // Send notification to user's devices
  if (user.deviceTokens.length > 0) {
    await PushNotificationService.sendToUser(user.id, {
      title: 'Email Verified',
      body: `Your email has been verified successfully. Enjoy using ChatApp!`,
    });
  }

  logger.info('Email verified successfully', { userId: user._id, email });
  return user;
};

export const loginUser = async (
  data: z.infer<typeof loginSchema>,
  ip: string,
  userAgent: string | undefined,
): Promise<{
  user: IUserDocument;
  tokens?: IAuthTokens;
  requires2FA?: boolean;
  otpStatus?: { resent: boolean; message: string };
}> => {
  try {
    const validatedData = loginSchema.parse(data);
    const user = await User.findOne({ email: validatedData.email }).select('+password');

    if (!user) {
      await logLoginAttempt(validatedData.email, ip, userAgent, false);
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
      await extendLock(user);
      throw new Error(
        `Account is locked until ${user.lockUntil.toLocaleString()}. Check your email for details.`,
      );
    }

    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      await logLoginAttempt(validatedData.email, ip, userAgent, false, user.id.toString());
      const failedCount = await LoginAttempt.countDocuments({
        userId: user._id,
        success: false,
        timestamp: { $gt: new Date(Date.now() - MINUTE_MS) },
      });
      if (failedCount >= FAILED_ATTEMPT_THRESHOLD) {
        await lockUser(user, 'excessive_failed_attempts');
        throw new Error(`Account locked due to too many failed attempts. Check your email.`);
      }
      throw new Error('Invalid email or password');
    }

    await logLoginAttempt(validatedData.email, ip, userAgent, true, user.id.toString());

    // Check for excessive successful logins
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

    // Check E2E key rotation
    if (user.needsKeyRotation()) {
      logger.info('User E2E keys need rotation', { userId: user._id });
      // In production, you might want to trigger key rotation here
      // or notify the client that keys need to be rotated
    }

    // Check email verification status
    if (!user.isVerified) {
      const otpStatus = await checkOTPStatus(validatedData.email, 'email_verification');
      let resentMessage = '';

      if (!otpStatus.exists || otpStatus.isExpired || otpStatus.isUsed) {
        try {
          const emailSent = await resendOTP(
            validatedData.email,
            'email_verification',
            user,
            user.username,
          );
          resentMessage = emailSent
            ? 'A new verification code has been sent to your email.'
            : 'A new verification code has been generated. Please check your email service configuration.';
        } catch (resendError) {
          logger.error('Auto-resend OTP failed during login', {
            userId: user._id,
            email: validatedData.email,
            error: (resendError as Error).message,
          });
          resentMessage =
            'Verification code generation failed. Please try again or contact support.';
        }
      } else if (otpStatus.isValid) {
        resentMessage = `Your verification code expires in ${Math.ceil(
          (otpStatus.expiresAt!.getTime() - Date.now()) / (1000 * 60),
        )} minutes.`;
      }

      throw new Error(
        otpStatus.isValid
          ? `Please verify your email first. ${resentMessage}`
          : `Please verify your email first. ${resentMessage}`,
      );
    }

    // 🔐 CHECK 2FA STATUS - IMPORTANT!
    if (user.twoFactorEnabled) {
      logger.info('2FA required for login', {
        userId: user._id,
        email: user.email,
      });

      // Add device token if provided (for push notifications)
      if (validatedData.deviceToken && validatedData.platform) {
        if (!user.deviceTokens.some(token => token.token === validatedData.deviceToken)) {
          user.deviceTokens.push({
            token: validatedData.deviceToken,
            platform: validatedData.platform,
            createdAt: new Date(),
          });
        }
        await user.save();
      }

      // Return that 2FA is required (don't generate tokens yet)
      return {
        user,
        requires2FA: true,
      };
    }

    // If 2FA is not enabled, proceed with normal login
    // Add device token if provided
    if (validatedData.deviceToken && validatedData.platform) {
      if (!user.deviceTokens.some(token => token.token === validatedData.deviceToken)) {
        user.deviceTokens.push({
          token: validatedData.deviceToken,
          platform: validatedData.platform,
          createdAt: new Date(),
        });
      }
      if (!user.subscribedTopics.includes(`platform_${validatedData.platform}`)) {
        user.subscribedTopics.push(`platform_${validatedData.platform}`);
      }
      if (!user.subscribedTopics.includes('all_users')) {
        user.subscribedTopics.push('all_users');
      }
      await user.save();

      // Subscribe device to default topics
      await PushNotificationService.subscribeToTopic(
        user.id,
        validatedData.deviceToken,
        'all_users',
      );
      await PushNotificationService.subscribeToTopic(
        user.id,
        validatedData.deviceToken,
        `platform_${validatedData.platform}`,
      );
    }

    // Generate tokens
    const { generateTokens } = await import('./token.service');
    const tokens = await generateTokens(user.id.toString());

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Send login notification
    if (validatedData.deviceToken) {
      await PushNotificationService.sendToDevice(validatedData.deviceToken, {
        title: 'New Login',
        body: `You have successfully logged into ChatApp from ${validatedData.platform || 'unknown'} device.`,
        data: {
          type: 'login',
          userId: user._id.toString(),
          platform: validatedData.platform || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info('User logged in successfully', {
      userId: user._id,
      email: validatedData.email,
      with2FA: false,
      e2eEnabled: user.securitySettings?.e2eEncryption,
    });

    return {
      user,
      tokens,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0].message}`);
    }
    logger.error('Login failed', { error });
    throw error;
  }
};

// 2FA login verification
export const verify2FALogin = async (
  email: string,
  token: string,
  deviceToken?: string,
  platform?: string,
  ip?: string,
  _userAgent?: string,
): Promise<{ user: IUserDocument; tokens: IAuthTokens }> => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new Error('2FA is not enabled for this account');
    }

    // Import services
    const { AdvancedRateLimitService, TwoFactorService } = await import('./index');

    // Check rate limit
    const rateLimit = await AdvancedRateLimitService.checkRateLimit(email, '2fa');
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many 2FA attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
      );
    }

    // Verify 2FA token
    const isValid = await TwoFactorService.verify2FAToken(user.id, token);
    if (!isValid) {
      logger.warn('Invalid 2FA token attempt', {
        userId: user.id,
        email,
        ip,
      });
      throw new Error('Invalid 2FA token. Please check your authenticator app and try again.');
    }

    // Reset rate limit on success
    await AdvancedRateLimitService.resetRateLimit(email, '2fa');

    // Add device token if provided
    if (deviceToken && platform) {
      if (!user.deviceTokens.some(t => t.token === deviceToken)) {
        user.deviceTokens.push({
          token: deviceToken,
          platform: platform as 'web' | 'android' | 'ios',
          createdAt: new Date(),
        });
      }
      if (!user.subscribedTopics.includes(`platform_${platform}`)) {
        user.subscribedTopics.push(`platform_${platform}`);
      }
      if (!user.subscribedTopics.includes('all_users')) {
        user.subscribedTopics.push('all_users');
      }
    }

    // Generate tokens after successful 2FA verification
    const { generateTokens } = await import('./token.service');
    const tokens = await generateTokens(user.id.toString());

    // Update user status
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    logger.info('2FA login successful', {
      userId: user._id,
      email: user.email,
    });

    return { user, tokens };
  } catch (error) {
    logger.error('2FA login verification failed', {
      error: (error as Error).message,
      email,
    });
    throw error;
  }
};

/**
 * Biometric login using WebAuthn
 */
export const biometricLogin = async (
  email: string,
  response: any,
  deviceToken?: string,
  platform?: string,
  ip?: string,
  userAgent?: string,
): Promise<{ user: IUserDocument; tokens: IAuthTokens }> => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      await logLoginAttempt(email, ip || 'unknown', userAgent, false);
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
      await extendLock(user);
      throw new Error(
        `Account is locked until ${user.lockUntil.toLocaleString()}. Check your email for details.`,
      );
    }

    // Verify WebAuthn authentication
    const verification = await WebAuthnService.verifyAuthentication(user.id, response);
    if (!verification.verified) {
      await logLoginAttempt(email, ip || 'unknown', userAgent, false, user.id);
      throw new Error('Biometric authentication failed');
    }

    await logLoginAttempt(email, ip || 'unknown', userAgent, true, user.id);

    // Add device token if provided
    if (deviceToken && platform) {
      if (!user.deviceTokens.some(t => t.token === deviceToken)) {
        user.deviceTokens.push({
          token: deviceToken,
          platform: platform as 'web' | 'android' | 'ios',
          createdAt: new Date(),
        });
      }
      if (!user.subscribedTopics.includes(`platform_${platform}`)) {
        user.subscribedTopics.push(`platform_${platform}`);
      }
      if (!user.subscribedTopics.includes('all_users')) {
        user.subscribedTopics.push('all_users');
      }
    }

    // Generate tokens
    const { generateTokens } = await import('./token.service');
    const tokens = await generateTokens(user.id.toString());

    // Update user status
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Subscribe to topics if device token provided
    if (deviceToken && platform) {
      const { PushNotificationService } = await import('./pushNotification.service');
      await PushNotificationService.subscribeToTopic(user.id, deviceToken, 'all_users');
      await PushNotificationService.subscribeToTopic(user.id, deviceToken, `platform_${platform}`);
    }

    logger.info('Biometric login successful', {
      userId: user._id,
      email,
    });

    return { user, tokens };
  } catch (error) {
    logger.error('Biometric login failed', {
      email,
      error: (error as Error).message,
    });
    throw error;
  }
};

export const forgotPassword = async (
  email: string,
): Promise<{ otpSent: boolean; message: string }> => {
  try {
    const validatedEmail = forgotPasswordSchema.parse({ email });
    const user = await User.findOne({ email: validatedEmail.email });
    if (!user) {
      logger.info('Password reset requested for non-existent email', {
        email: validatedEmail.email,
      });
      return { otpSent: false, message: 'If an account exists, a reset link has been sent.' };
    }

    const otpStatus = await checkOTPStatus(validatedEmail.email, 'password_reset');
    let otpSent = false;
    let message = '';

    if (!otpStatus.exists || otpStatus.isExpired || otpStatus.isUsed) {
      try {
        otpSent = await resendOTP(validatedEmail.email, 'password_reset', user);
        message = otpSent
          ? 'Password reset code sent to your email.'
          : 'Password reset code generated. Please check your email service configuration.';
      } catch (resendError) {
        logger.error('Resend OTP failed during forgot password', {
          userId: user._id,
          email: validatedEmail.email,
          error: (resendError as Error).message,
        });
        message = 'Failed to generate reset code. Please try again.';
        otpSent = false;
      }
    } else {
      otpSent = true;
      message = `Your password reset code expires in ${Math.ceil(
        (otpStatus.expiresAt!.getTime() - Date.now()) / (1000 * 60),
      )} minutes.`;
    }

    // Send notification to user's devices
    if (otpSent && user.deviceTokens.length > 0) {
      await PushNotificationService.sendToUser(user.id, {
        title: 'Password Reset Request',
        body: 'A password reset request was made for your account. If this was not you, secure your account immediately.',
      });
    }

    logger.info('Password reset processed', {
      userId: user._id,
      email: validatedEmail.email,
      otpSent,
      otpStatus: otpStatus.isValid ? 'valid' : otpStatus.isExpired ? 'expired' : 'none',
    });
    return { otpSent, message };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0].message}`);
    }
    logger.error('Forgot password failed', { error });
    throw error;
  }
};

export const verifyPasswordResetOTP = async (email: string, otp: string): Promise<boolean> => {
  const isValid = await verifyOTP(email, otp, 'password_reset');
  if (!isValid) {
    throw new Error('Invalid or expired OTP');
  }

  logger.info('Password reset OTP verified', { email });
  return true;
};

export const resetPassword = async (email: string, newPassword: string): Promise<void> => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new Error('User not found');
  }

  user.password = newPassword;
  await user.save();

  // Clean up OTP
  await OTP.deleteOne({ email, type: 'password_reset' });

  // Send notification to user's devices
  if (user.deviceTokens.length > 0) {
    await PushNotificationService.sendToUser(user.id, {
      title: 'Password Reset Successful',
      body: 'Your password has been successfully reset. If this was not you, secure your account immediately.',
    });
  }

  logger.info('Password reset successfully', { userId: user._id, email });
};

export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await User.findById(userId).select('+password');
  if (!user || !user.password) {
    throw new Error('User not found or no password set');
  }

  const isOldPasswordValid = await user.comparePassword(oldPassword);
  if (!isOldPasswordValid) {
    throw new Error('Old password is incorrect');
  }

  if (await user.comparePassword(newPassword)) {
    throw new Error('New password cannot be the same as old password');
  }

  user.password = newPassword;
  await user.save();

  // Send notification to user's devices
  if (user.deviceTokens.length > 0) {
    await PushNotificationService.sendToUser(user.id, {
      title: 'Password Changed',
      body: 'Your password has been changed successfully.',
    });
  }

  logger.info('Password changed successfully', { userId });
};

export const resendVerificationEmail = async (
  email: string,
  otpType: 'email_verification' | 'password_reset' = 'email_verification',
): Promise<{ otpSent: boolean; message: string }> => {
  try {
    const validatedEmail = z.string().email('Invalid email address').parse(email);
    const user = await User.findOne({ email: validatedEmail });

    if (!user) {
      return {
        otpSent: false,
        message: 'If an account exists, a verification email has been sent.',
      };
    }

    if (user.isVerified && otpType === 'email_verification') {
      return {
        otpSent: false,
        message: 'Email already verified.',
      };
    }

    const otpStatus = await checkOTPStatus(validatedEmail, otpType);
    let otpSent = false;
    let message = '';

    if (!otpStatus.exists || otpStatus.isExpired || otpStatus.isUsed) {
      try {
        otpSent = await resendOTP(validatedEmail, otpType, user);
        message = otpSent
          ? 'Verification code sent to your email.'
          : 'Verification code generated. Please check your email service configuration.';
      } catch (resendError) {
        logger.error('Resend verification email failed', {
          userId: user._id,
          email: validatedEmail,
          error: (resendError as Error).message,
        });
        message = 'Failed to send verification email. Please try again.';
        otpSent = false;
      }
    } else {
      otpSent = true;
      message = `Your verification code expires in ${Math.ceil(
        (otpStatus.expiresAt!.getTime() - Date.now()) / (1000 * 60),
      )} minutes.`;
    }

    // Send notification to user's devices
    if (otpSent && user.deviceTokens.length > 0) {
      await PushNotificationService.sendToUser(user.id, {
        title: 'Verification Code Sent',
        body: `A new ${otpType === 'email_verification' ? 'email verification' : 'password reset'} code has been sent to your email.`,
      });
    }

    logger.info('Verification email resent', {
      userId: user._id,
      email: validatedEmail,
      otpSent,
    });
    return { otpSent, message };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0].message}`);
    }
    logger.error('Resend verification failed', { error });
    throw error;
  }
};

export const subscribeToTopic = async (
  userId: string,
  deviceToken: string,
  topic: string,
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const success = await PushNotificationService.subscribeToTopic(userId, deviceToken, topic);
  if (!success) {
    throw new Error('Failed to subscribe to topic');
  }

  logger.info('Subscribed to topic', {
    userId,
    topic,
    deviceToken: `${deviceToken.substring(0, 10)}...`,
  });
};

export const unsubscribeFromTopic = async (
  userId: string,
  deviceToken: string,
  topic: string,
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const success = await PushNotificationService.unsubscribeFromTopic(userId, deviceToken, topic);
  if (!success) {
    throw new Error('Failed to unsubscribe from topic');
  }

  logger.info('Unsubscribed from topic', {
    userId,
    topic,
    deviceToken: `${deviceToken.substring(0, 10)}...`,
  });
};

export const logoutAllDevices = async (
  userId: string,
  clearDeviceTokens: boolean = false,
): Promise<{ message: string; revokedCount: number }> =>
  await logoutUser(userId, undefined, true, clearDeviceTokens);

export const logoutCurrentDevice = async (
  userId: string,
  refreshToken: string,
  clearDeviceTokens: boolean = false,
): Promise<{ message: string; revokedCount: number }> =>
  await logoutUser(userId, refreshToken, false, clearDeviceTokens);

export const logoutUser = async (
  userId: string,
  refreshToken?: string,
  revokeAll: boolean = true,
  clearDeviceTokens: boolean = false,
): Promise<{ message: string; revokedCount: number }> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let revokedCount = 0;

    if (revokeAll) {
      const result = await RefreshToken.updateMany(
        { userId: user._id, isRevoked: false },
        { isRevoked: true },
      );
      revokedCount = result.modifiedCount;

      logger.info('All refresh tokens revoked for user', {
        userId,
        email: user.email,
        revokedCount,
      });
    } else if (refreshToken) {
      const result = await RefreshToken.findOneAndUpdate(
        {
          token: refreshToken,
          userId: user._id,
          isRevoked: false,
        },
        { isRevoked: true },
      );

      if (result) {
        revokedCount = 1;
        logger.info('Specific refresh token revoked', {
          userId,
          email: user.email,
          tokenPrefix: `${refreshToken.substring(0, 20)}...`,
        });
      } else {
        logger.warn('Refresh token not found or already revoked', {
          userId,
          tokenPrefix: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'none',
        });
      }
    }

    if (clearDeviceTokens) {
      const oldDeviceTokens = user.deviceTokens.map(token => ({
        token: token.token,
        platform: token.platform,
      }));
      user.deviceTokens = [];
      user.subscribedTopics = [];
      await user.save();

      // Unsubscribe from all topics for old device tokens
      for (const { token, platform } of oldDeviceTokens) {
        await PushNotificationService.unsubscribeFromTopic(userId, token, 'all_users');
        await PushNotificationService.unsubscribeFromTopic(userId, token, `platform_${platform}`);
      }

      logger.info('All device tokens and subscriptions cleared', { userId, email: user.email });
    }

    user.status = 'offline';
    user.lastSeen = new Date();
    await user.save();

    // Send logout notification
    if (user.deviceTokens.length > 0) {
      await PushNotificationService.sendToUser(user.id, {
        title: 'Logged Out',
        body: `You have been logged out from ${revokeAll ? 'all devices' : 'this device'}.`,
      });
    }

    logger.info('User logged out successfully', {
      userId,
      email: user.email,
      revokedCount,
      method: revokeAll ? 'all_tokens' : 'specific_token',
    });

    return {
      message: revokeAll
        ? 'Logged out successfully. All sessions have been terminated.'
        : 'Current session has been terminated.',
      revokedCount,
    };
  } catch (error) {
    logger.error('Logout failed', {
      userId,
      error: (error as Error).message,
    });
    throw error;
  }
};

export const logLoginAttempt = async (
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
    logger.debug('Login attempt logged', { email, success, ip });
  } catch (error) {
    logger.error('Failed to log login attempt', {
      email,
      success,
      ip,
      error: (error as Error).message,
    });
  }
};

const lockUser = async (
  user: IUserDocument,
  reason: 'excessive_failed_attempts' | 'excessive_successful_logins',
): Promise<void> => {
  try {
    const baseMinutes = reason === 'excessive_failed_attempts' ? 30 : 20;
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
        reason:
          reason === 'excessive_failed_attempts'
            ? 'too many failed login attempts'
            : 'too many successful logins in a short time',
        unlockTime,
        duration,
        title: 'ChatApp Account Locked',
        lockCount: user.lockCount,
        isExtended: false,
        currentYear: new Date().getFullYear(),
      },
    });

    // Send notification to user's devices
    if (user.deviceTokens.length > 0) {
      await PushNotificationService.sendToUser(user.id, {
        title: 'Account Locked',
        body: `Your account has been locked due to ${reason === 'excessive_failed_attempts' ? 'too many failed login attempts' : 'too many successful logins'}. Check your email for details.`,
      });
    }

    logger.warn('Account locked', {
      userId: user._id,
      email: user.email,
      reason,
      duration,
      lockCount: user.lockCount,
    });
  } catch (error) {
    logger.error('Failed to lock user account', {
      userId: user._id,
      email: user.email,
      reason,
      error: (error as Error).message,
    });
    throw error;
  }
};

const extendLock = async (user: IUserDocument): Promise<void> => {
  try {
    if (!user.lockUntil || user.lockUntil <= new Date()) return;

    const additionalMinutes = 10;
    user.lockUntil = new Date(user.lockUntil.getTime() + additionalMinutes * MINUTE_MS);
    user.lockCount += 1;
    await user.save();

    const unlockTime = user.lockUntil.toLocaleString();
    const duration = additionalMinutes;

    await sendEmail({
      to: user.email,
      subject: 'ChatApp Account Lock Extended - Continued Suspicious Activity',
      template: 'accountLocked',
      context: {
        username: user.username,
        email: user.email,
        title: 'ChatApp Account Lock Extended',
        reason:
          user.lockReason === 'excessive_failed_attempts'
            ? 'continued failed login attempts during lock'
            : 'continued activity during lock',
        unlockTime,
        duration,
        lockCount: user.lockCount,
        isExtended: true,
        currentYear: new Date().getFullYear(),
      },
    });

    // Send notification to user's devices
    if (user.deviceTokens.length > 0) {
      await PushNotificationService.sendToUser(user.id, {
        title: 'Account Lock Extended',
        body: `Your account lock has been extended due to continued suspicious activity. Check your email for details.`,
      });
    }

    logger.warn('Account lock extended', {
      userId: user._id,
      email: user.email,
      additionalMinutes,
      newLockCount: user.lockCount,
    });
  } catch (error) {
    logger.error('Failed to extend user account lock', {
      userId: user._id,
      email: user.email,
      error: (error as Error).message,
    });
    throw error;
  }
};
