import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { User } from '../models';
import {
  changePassword as changePasswordService,
  forgotPassword as forgotPass,
  loginUser,
  logoutAllDevices,
  logoutCurrentDevice,
  registerUser,
  resendVerificationEmail,
  resetPassword,
  SessionService,
  subscribeToTopic,
  unsubscribeFromTopic,
  verify2FALogin as verify2FALoginService,
  verifyEmailOTP,
  verifyPasswordResetOTP,
  verifyRefreshToken,
} from '../services';
import { errorResponse, successResponse } from '../utils';

export const register = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { user, otpSent } = await registerUser(req.body);
    return successResponse({
      res,
      statusCode: 201,
      message: 'User registered successfully. Please check your email for verification.',
      data: { user: { id: user.id, email: user.email, username: user.username }, otpSent },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Registration error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const verifyEmail = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    const user = await verifyEmailOTP(email, otp);
    return successResponse({
      res,
      message: 'Email verified successfully',
      data: { user: { id: user.id, email: user.email, username: user.username } },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Email verification error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const login = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const loginResult = await loginUser(req.body, req.ip ?? '', req.headers['user-agent']);

    // Check if 2FA is required
    if (loginResult.requires2FA) {
      return successResponse({
        res,
        message: '2FA verification required. Please provide your 2FA token.',
        data: {
          requires2FA: true,
          user: {
            id: loginResult.user.id,
            email: loginResult.user.email,
          },
        },
      });
    }

    // Normal login without 2FA - create session
    const sessionId = await SessionService.createSession({
      userId: loginResult.user.id,
      deviceType: req.body.platform || 'web',
      userAgent: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip || 'unknown',
      lastActivity: new Date(),
    });

    return successResponse({
      res,
      message: 'Login successful',
      data: {
        user: {
          id: loginResult.user.id,
          email: loginResult.user.email,
          username: loginResult.user.username,
          twoFactorEnabled: loginResult.user.twoFactorEnabled,
        },
        tokens: loginResult.tokens,
        sessionId,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Login error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 401 });
  }
};

// 2FA Login Verification Controller
export const verify2FALogin = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { email, token, deviceToken, platform } = req.body;

    if (!email || !token) {
      return errorResponse({
        res,
        message: 'Email and 2FA token are required',
        statusCode: 400,
      });
    }

    const { user, tokens } = await verify2FALoginService(
      email,
      token,
      deviceToken,
      platform,
      req.ip,
      req.headers['user-agent'],
    );

    // Create session for 2FA login
    const sessionId = await SessionService.createSession({
      userId: user.id,
      deviceType: (platform as 'web' | 'mobile' | 'desktop') || 'web',
      userAgent: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip || 'unknown',
      lastActivity: new Date(),
    });

    logger.info('2FA login successful', {
      userId: user._id,
      email: user.email,
      sessionId,
    });

    return successResponse({
      res,
      message: 'Login successful with 2FA',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          twoFactorEnabled: true,
        },
        tokens,
        sessionId,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('2FA login verification error', { error: err.message });
    return errorResponse({
      res,
      message: err.message,
      statusCode: 400,
    });
  }
};

export const refreshToken = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;
    const { userId, newTokens } = await verifyRefreshToken(token);
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }
    return successResponse({
      res,
      message: 'Token refreshed successfully',
      data: { tokens: newTokens },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Token refresh error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 401 });
  }
};

export const forgotPassword = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { email } = req.body;
    const { otpSent, message } = await forgotPass(email);
    return successResponse({
      res,
      message,
      data: { otpSent },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Forgot password error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const passwordResetOTP = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    await verifyPasswordResetOTP(email, otp);
    return successResponse({
      res,
      message: 'OTP verified successfully. You can now reset your password.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Password reset OTP verification error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const resetPasswordController = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { email, newPassword } = req.body;
    await resetPassword(email, newPassword);
    return successResponse({
      res,
      message: 'Password reset successfully.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Reset password error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const changePassword = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    await changePasswordService(userId, oldPassword, newPassword);

    return successResponse({
      res,
      message: 'Password changed successfully.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Change password error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const resendVerification = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { email, otpType } = req.body;
    const result = await resendVerificationEmail(email, otpType);
    return successResponse({
      res,
      message: result.message,
      data: { otpSent: result.otpSent },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Resend verification error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const subscribeTopic = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { deviceToken, topic } = req.body;
    const userId = req.user.id;

    await subscribeToTopic(userId, deviceToken, topic);

    return successResponse({
      res,
      message: `Successfully subscribed to topic: ${topic}`,
      data: { userId, topic },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Subscribe topic error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const unsubscribeTopic = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { deviceToken, topic } = req.body;
    const userId = req.user.id;

    await unsubscribeFromTopic(userId, deviceToken, topic);

    return successResponse({
      res,
      message: `Successfully unsubscribed from topic: ${topic}`,
      data: { userId, topic },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Unsubscribe topic error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const logout = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { refreshToken, clearDeviceTokens, sessionId } = req.body;
    const userId = req.user.id;

    let result;

    // Terminate session if sessionId provided
    if (sessionId) {
      await SessionService.terminateSession(userId, sessionId);
    }

    if (refreshToken) {
      result = await logoutCurrentDevice(userId, refreshToken, clearDeviceTokens);
    } else {
      result = await logoutAllDevices(userId, clearDeviceTokens);
    }

    return successResponse({
      res,
      message: result.message,
      data: {
        userId,
        email: req.user.email,
        logoutType: refreshToken ? 'current_device' : 'all_devices',
        revokedCount: result.revokedCount,
        status: 'offline',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Logout error', { error: err.message });
    return errorResponse({
      res,
      message: err.message || 'Logout failed',
      statusCode: 400,
    });
  }
};

export const logoutAll = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { clearDeviceTokens } = req.body;
    const userId = req.user.id;

    // Terminate all sessions
    const sessions = await SessionService.getUserSessions(userId);
    for (const session of sessions) {
      await SessionService.terminateSession(userId, session.sessionId);
    }

    const result = await logoutAllDevices(userId, clearDeviceTokens);

    return successResponse({
      res,
      message: result.message,
      data: {
        userId,
        email: req.user.email,
        action: 'logout_all_devices',
        revokedCount: result.revokedCount,
        status: 'offline',
        allSessionsTerminated: true,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Global logout error', { error: err.message });
    return errorResponse({
      res,
      message: err.message || 'Global logout failed',
      statusCode: 400,
    });
  }
};
