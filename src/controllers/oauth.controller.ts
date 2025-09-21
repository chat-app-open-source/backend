/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { logger } from '../config';
import { handleOAuthLogin } from '../services';
import { IOAuthUser } from '../types';
import { errorResponse, successResponse } from '../utils';

interface GoogleProfile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: [{ value: string }];
  photos: [{ value: string }];
}

interface FacebookProfile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: [{ value: string }];
  photos: [{ value: string }];
}

export const googleCallback = async (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { session: false }, async (err: any, profile: GoogleProfile) => {
    if (err || !profile) {
      logger.error('Google OAuth error', { error: err?.message });
      return errorResponse({ res, message: 'Google authentication failed', statusCode: 401 });
    }

    try {
      const oauthUser: IOAuthUser = {
        oauthId: profile.id,
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        profilePicture: profile.photos?.[0]?.value || '',
      };

      const { user, tokens } = await handleOAuthLogin('google', oauthUser);
      return successResponse({
        res,
        message: 'Google login successful',
        data: { user: { id: user._id, email: user.email, username: user.username }, tokens },
      });
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('Google OAuth callback error', { error: err.message });
      return errorResponse({ res, message: err.message, statusCode: 401 });
    }
  })(req, res, next);
};

export const facebookCallback = async (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'facebook',
    { session: false },
    async (err: any, profile: FacebookProfile) => {
      if (err || !profile) {
        logger.error('Facebook OAuth error', { error: err?.message });
        return errorResponse({ res, message: 'Facebook authentication failed', statusCode: 401 });
      }

      try {
        const oauthUser: IOAuthUser = {
          oauthId: profile.id,
          email: profile.emails?.[0]?.value || `${profile.id}@facebook.com`,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          profilePicture: profile.photos?.[0]?.value || '',
        };

        const { user, tokens } = await handleOAuthLogin('facebook', oauthUser);
        return successResponse({
          res,
          message: 'Facebook login successful',
          data: { user: { id: user._id, email: user.email, username: user.username }, tokens },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('Facebook OAuth callback error', { error: err.message });
        return errorResponse({ res, message: err.message, statusCode: 401 });
      }
    },
  )(req, res, next);
};
