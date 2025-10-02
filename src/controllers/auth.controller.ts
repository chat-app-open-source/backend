import type { NextFunction, Request, Response } from 'express';

import { logger } from '../config';
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
    const { user, tokens } = await loginUser(req.body, req.ip ?? '', req.headers['user-agent']);
    return successResponse({
      res,
      message: 'Login successful',
      data: { user: { id: user.id, email: user.email, username: user.username }, tokens },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Login error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 401 });
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
    const otpSent = await forgotPass(email);
    return successResponse({
      res,
      message: 'Password reset OTP sent to your email.',
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

export const logout = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { refreshToken } = req.body;
    const userId = req.user.id;

    let result;

    if (refreshToken) {
      result = await logoutCurrentDevice(userId, refreshToken);
    } else {
      result = await logoutAllDevices(userId);
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

    const userId = req.user.id;
    const result = await logoutAllDevices(userId);

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
