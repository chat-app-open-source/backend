/* eslint-disable @typescript-eslint/no-explicit-any */
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import type { PlatformRequest } from '../types/auth.types';

import { oauthConfig } from './env';
import logger from './logger';

// Google Strategy with platform support
passport.use(
  new GoogleStrategy(
    {
      clientID: oauthConfig.google.clientID,
      clientSecret: oauthConfig.google.clientSecret,
      callbackURL: oauthConfig.google.callbackURL,
      passReqToCallback: true,
      scope: ['email', 'profile', 'openid'],
    },
    (
      req: PlatformRequest,
      _accessToken: string,
      _refreshToken: string,
      profile: any,
      done: Function,
    ) => {
      const platform = req.platform || 'web';
      logger.info(`Google OAuth profile received from ${platform}`, {
        profileId: profile.id,
        email: profile.emails?.[0]?.value,
        platform,
        ip: req.ip,
      });

      // Attach platform info to profile
      profile.platform = platform;
      profile.ip = req.ip;

      return done(null, profile);
    },
  ),
);

// Facebook Strategy with platform support
passport.use(
  new FacebookStrategy(
    {
      clientID: oauthConfig.facebook.clientID,
      clientSecret: oauthConfig.facebook.clientSecret,
      callbackURL: oauthConfig.facebook.callbackURL,
      profileFields: ['id', 'emails', 'name', 'photos'],
      scope: ['email'],
      passReqToCallback: true,
    },
    (
      req: PlatformRequest,
      _accessToken: string,
      _refreshToken: string,
      profile: any,
      done: Function,
    ) => {
      const platform = req.platform || 'web';
      const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;

      logger.info(`Facebook OAuth profile received from ${platform}`, {
        profileId: profile.id,
        email,
        platform,
        ip: req.ip,
      });

      // Attach platform info to profile
      profile.platform = platform;
      profile.ip = req.ip;

      return done(null, profile);
    },
  ),
);

// Serialize user (store minimal data for session - not used in stateless JWT)
passport.serializeUser((user: any, done: Function) => {
  done(null, {
    id: user.id,
    provider: user.provider || 'unknown',
    platform: user.platform || 'web',
    email: user.emails?.[0]?.value,
  });
});

// Deserialize user (fetch full profile - not used in stateless JWT)
passport.deserializeUser((userObj: any, done: Function) => {
  done(null, userObj);
});

export default passport;
