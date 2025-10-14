import type { NextFunction, Response } from 'express';

import logger from '../config/logger';
import { handleOAuthLogin } from '../services';
import type {
  FacebookProfile,
  GoogleProfile,
  IOAuthUser,
  IUserDocument,
  PlatformRequest,
} from '../types/auth.types';
import { errorResponse, successResponse } from '../utils';

export const googleCallback = async (req: PlatformRequest, res: Response, _next: NextFunction) => {
  const profile = req.user as unknown as GoogleProfile;

  if (!profile || !profile.id) {
    logger.error('Google OAuth profile missing after authentication');
    return errorResponse({
      res,
      message: 'Google OAuth profile missing',
      statusCode: 400,
    });
  }

  try {
    const platform = req.platform || 'web';
    logger.info(`Google OAuth callback from ${platform}`, {
      userId: profile.id,
      email: profile.emails?.[0]?.value,
      ip: req.ip,
    });

    const oauthUser: IOAuthUser = {
      oauthId: profile.id,
      email: profile.emails?.[0]?.value || '',
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      profilePicture: profile.photos?.[0]?.value || '',
    };

    const { user, tokens } = await handleOAuthLogin(
      'google',
      oauthUser,
      req.ip ?? 'unknown',
      req.headers['user-agent'] as string | undefined,
    );

    // Safe type assertion - user is guaranteed to exist from handleOAuthLogin
    const safeUser = user as IUserDocument;

    // Platform-specific response
    const responseData = {
      provider: 'google',
      platform,
      user: {
        id: safeUser.id.toString(),
        email: safeUser.email,
        username: safeUser.username,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        profilePicture: safeUser.profilePicture,
        isVerified: safeUser.isVerified,
        status: safeUser.status,
        oauthProvider: safeUser.oauthProvider,
        createdAt: safeUser.createdAt.toISOString(),
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: '1h',
        refreshExpiresIn: '7d',
      },
      // Platform-specific deep link (if needed)
      ...(platform !== 'web' && {
        deepLink: `${platform}://auth/success?accessToken=${tokens.accessToken}&platform=${platform}`,
      }),
    };

    return successResponse({
      res,
      message: `Google login successful on ${platform}`,
      data: responseData,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Google OAuth processing error', {
      error: err.message,
      platform: req.platform,
      ip: req.ip,
    });
    return errorResponse({
      res,
      message: `Google OAuth failed: ${err.message}`,
      statusCode: 401,
    });
  }
};

export const facebookCallback = async (
  req: PlatformRequest,
  res: Response,
  _next: NextFunction,
) => {
  const profile = req.user as unknown as FacebookProfile;

  if (!profile || !profile.id) {
    logger.error('Facebook OAuth profile missing after authentication');
    return errorResponse({
      res,
      message: 'Facebook OAuth profile missing',
      statusCode: 400,
    });
  }

  try {
    const platform = req.platform || 'web';
    const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;

    logger.info(`Facebook OAuth callback from ${platform}`, {
      userId: profile.id,
      email,
      ip: req.ip,
    });

    const oauthUser: IOAuthUser = {
      oauthId: profile.id,
      email,
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      profilePicture: profile.photos?.[0]?.value || '',
    };

    const { user, tokens } = await handleOAuthLogin(
      'facebook',
      oauthUser,
      req.ip ?? 'unknown',
      req.headers['user-agent'] as string | undefined,
    );

    // Safe type assertion - user is guaranteed to exist from handleOAuthLogin
    const safeUser = user as IUserDocument;

    // Platform-specific response
    const responseData = {
      provider: 'facebook',
      platform,
      user: {
        id: safeUser.id.toString(),
        email: safeUser.email,
        username: safeUser.username,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        profilePicture: safeUser.profilePicture,
        isVerified: safeUser.isVerified,
        status: safeUser.status,
        oauthProvider: safeUser.oauthProvider,
        createdAt: safeUser.createdAt.toISOString(),
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: '1h',
        refreshExpiresIn: '7d',
      },
      // Platform-specific deep link (if needed)
      ...(platform !== 'web' && {
        deepLink: `${platform}://auth/success?accessToken=${tokens.accessToken}&platform=${platform}`,
      }),
    };

    return successResponse({
      res,
      message: `Facebook login successful on ${platform}`,
      data: responseData,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Facebook OAuth processing error', {
      error: err.message,
      platform: req.platform,
      ip: req.ip,
    });
    return errorResponse({
      res,
      message: `Facebook OAuth failed: ${err.message}`,
      statusCode: 401,
    });
  }
};
