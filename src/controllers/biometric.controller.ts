import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { User } from '../models';
import {
  AdvancedRateLimitService,
  biometricLogin as biometricLoginService,
  SessionService,
  WebAuthnService,
} from '../services';
import { errorResponse, successResponse } from '../utils';

export const generateRegistrationOptions = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { deviceName, deviceType } = req.body;
    const userId = req.user.id;

    // Check rate limit
    const rateLimit = await AdvancedRateLimitService.checkRateLimit(userId, 'biometric');
    if (!rateLimit.allowed) {
      return errorResponse({
        res,
        message: `Too many biometric registration attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
        statusCode: 429,
      });
    }

    const options = await WebAuthnService.generateRegistrationOptions(
      userId,
      deviceName,
      deviceType,
    );

    return successResponse({
      res,
      message: 'Biometric registration options generated successfully',
      data: options,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Generate registration options error', {
      userId: req.user?.id,
      error: err.message,
    });
    return errorResponse({
      res,
      message: err.message,
      statusCode: 400,
    });
  }
};

export const verifyRegistration = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const verification = await WebAuthnService.verifyRegistration(userId, req.body);

    if (!verification.verified) {
      return errorResponse({
        res,
        message: 'Biometric registration verification failed',
        statusCode: 400,
      });
    }

    // Reset rate limit on success
    await AdvancedRateLimitService.resetRateLimit(userId, 'biometric');

    return successResponse({
      res,
      message: 'Biometric registration completed successfully',
      data: { verified: true },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Verify registration error', {
      userId: req.user?.id,
      error: err.message,
    });
    return errorResponse({
      res,
      message: err.message,
      statusCode: 400,
    });
  }
};

export const generateAuthenticationOptions = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    const { email } = req.body;

    // Check rate limit
    const rateLimit = await AdvancedRateLimitService.checkRateLimit(email, 'login');
    if (!rateLimit.allowed) {
      return errorResponse({
        res,
        message: `Too many authentication attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
        statusCode: 429,
      });
    }

    const options = await WebAuthnService.generateAuthenticationOptions(email);

    return successResponse({
      res,
      message: 'Biometric authentication options generated successfully',
      data: options,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Generate authentication options error', {
      email: req.body.email,
      error: err.message,
    });
    return errorResponse({
      res,
      message: 'Authentication failed',
      statusCode: 400,
    });
  }
};

export const verifyAuthentication = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { email, response, deviceToken, platform } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse({
        res,
        message: 'Authentication failed',
        statusCode: 401,
      });
    }

    // Verify WebAuthn authentication
    const verification = await WebAuthnService.verifyAuthentication(user.id, response);
    if (!verification.verified) {
      await AdvancedRateLimitService.checkRateLimit(email, 'login');
      return errorResponse({
        res,
        message: 'Biometric authentication failed',
        statusCode: 401,
      });
    }

    // Reset rate limit on success
    await AdvancedRateLimitService.resetRateLimit(email, 'login');

    // Complete login process
    const { user: loggedInUser, tokens } = await biometricLoginService(
      email,
      response,
      deviceToken,
      platform,
      req.ip,
      req.headers['user-agent'],
    );

    // Create session
    const sessionId = await SessionService.createSession({
      userId: loggedInUser.id,
      deviceType: (platform as 'web' | 'mobile' | 'desktop') || 'web',
      userAgent: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip || 'unknown',
      lastActivity: new Date(),
    });

    logger.info('Biometric authentication successful', {
      userId: user._id,
      email,
    });

    return successResponse({
      res,
      message: 'Biometric authentication successful',
      data: {
        user: {
          id: loggedInUser.id,
          email: loggedInUser.email,
          username: loggedInUser.username,
          biometricEnabled: true,
        },
        tokens,
        sessionId,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Verify authentication error', {
      email: req.body.email,
      error: err.message,
    });
    return errorResponse({
      res,
      message: err.message,
      statusCode: 400,
    });
  }
};

export const getCredentials = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const credentials = await WebAuthnService.getCredentials(userId);

    return successResponse({
      res,
      message: 'Biometric credentials retrieved successfully',
      data: { credentials },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get credentials error', {
      userId: req.user?.id,
      error: err.message,
    });
    return errorResponse({
      res,
      message: err.message,
      statusCode: 400,
    });
  }
};

export const removeCredential = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { credentialID } = req.body;
    const userId = req.user.id;

    const success = await WebAuthnService.removeCredential(userId, credentialID);

    if (!success) {
      return errorResponse({
        res,
        message: 'Failed to remove biometric credential',
        statusCode: 400,
      });
    }

    return successResponse({
      res,
      message: 'Biometric credential removed successfully',
      data: { success: true },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Remove credential error', {
      userId: req.user?.id,
      error: err.message,
    });
    return errorResponse({
      res,
      message: err.message,
      statusCode: 400,
    });
  }
};

export const getBiometricStatus = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const isEnabled = await WebAuthnService.isBiometricEnabled(userId);
    const credentials = await WebAuthnService.getCredentials(userId);

    return successResponse({
      res,
      message: 'Biometric status retrieved successfully',
      data: {
        isEnabled,
        credentialsCount: credentials.length,
        securitySettings: {
          biometricLogin: req.user.securitySettings?.biometricLogin || false,
        },
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get biometric status error', {
      userId: req.user?.id,
      error: err.message,
    });
    return errorResponse({
      res,
      message: err.message,
      statusCode: 400,
    });
  }
};
