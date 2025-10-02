import { NextFunction, Request, Response } from 'express';
import { logger } from '../config';
import { handleOAuthLogin } from '../services';
import { IOAuthUser } from '../types/auth.types';
import { errorResponse, successResponse } from '../utils';

export const mockGoogleOAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Check if mock is enabled and request is for Google
  if (process.env.NODE_ENV === 'dev' && req.query.mock === 'google') {
    logger.info('🔄 Mock Google OAuth requested', {
      ip: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    });

    const mockUser: IOAuthUser = {
      oauthId: `mock-google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `test.google.user+${Date.now()}@gmail.com`,
      firstName: 'John',
      lastName: 'Mock',
      profilePicture: 'https://via.placeholder.com/150x150/4285f4/ffffff?text=Google',
    };

    try {
      const { user, tokens } = await handleOAuthLogin(
        'google',
        mockUser,
        req.ip || '127.0.0.1',
        req.headers['user-agent'] as string | undefined,
      );

      logger.info('✅ Mock Google OAuth completed successfully', {
        userId: user._id,
        email: user.email,
        username: user.username,
      });

      return successResponse({
        res,
        message: 'Mock Google OAuth successful',
        data: {
          provider: 'google',
          platform: 'mock',
          user: {
            id: user.id.toString(),
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            isVerified: user.isVerified,
            status: user.status,
            mock: true,
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: '15m', // Updated to match JWT_EXPIRE=15m
            refreshExpiresIn: '7d',
          },
        },
      });
    } catch (error) {
      logger.error('Mock Google OAuth failed', {
        error: (error as Error).message,
        ip: req.ip,
      });
      return errorResponse({
        res,
        message: 'Mock Google OAuth failed',
        statusCode: 500,
        details: { error: (error as Error).message },
      });
    }
  }

  // If not mock request, continue to next middleware
  return next();
};

export const mockFacebookOAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Check if mock is enabled and request is for Facebook
  if (process.env.NODE_ENV === 'dev' && req.query.mock === 'facebook') {
    logger.info('🔄 Mock Facebook OAuth requested', {
      ip: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    });

    const mockUser: IOAuthUser = {
      oauthId: `mock-facebook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `test.facebook.user+${Date.now()}@fb.com`,
      firstName: 'Jane',
      lastName: 'Mock',
      profilePicture: 'https://via.placeholder.com/150x150/1877f2/ffffff?text=Facebook',
    };

    try {
      const { user, tokens } = await handleOAuthLogin(
        'facebook',
        mockUser,
        req.ip || '127.0.0.1',
        req.headers['user-agent'] as string | undefined,
      );

      logger.info('✅ Mock Facebook OAuth completed successfully', {
        userId: user._id,
        email: user.email,
        username: user.username,
      });

      return successResponse({
        res,
        message: 'Mock Facebook OAuth successful',
        data: {
          provider: 'facebook',
          platform: 'mock',
          user: {
            id: user.id.toString(),
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            isVerified: user.isVerified,
            status: user.status,
            mock: true,
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: '15m', // Updated to match JWT_EXPIRE=15m
            refreshExpiresIn: '7d',
          },
        },
      });
    } catch (error) {
      logger.error('Mock Facebook OAuth failed', {
        error: (error as Error).message,
        ip: req.ip,
      });
      return errorResponse({
        res,
        message: 'Mock Facebook OAuth failed',
        statusCode: 500,
        details: { error: (error as Error).message },
      });
    }
  }

  // If not mock request, continue to next middleware
  return next();
};
