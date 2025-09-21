import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { oauthConfig } from './env.config';
import logger from './logger';

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: oauthConfig.google.clientID,
      clientSecret: oauthConfig.google.clientSecret,
      callbackURL: oauthConfig.google.callbackURL,
    },
    (_accessToken, _refreshToken, profile, done) => {
      logger.info('Google OAuth profile received', { profileId: profile.id });
      return done(null, profile);
    },
  ),
);

// Facebook Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: oauthConfig.facebook.clientID,
      clientSecret: oauthConfig.facebook.clientSecret,
      callbackURL: oauthConfig.facebook.callbackURL,
      profileFields: ['id', 'emails', 'name', 'photos'],
    },
    (_accessToken, _refreshToken, profile, done) => {
      logger.info('Facebook OAuth profile received', { profileId: profile.id });
      return done(null, profile);
    },
  ),
);

// Serialize user
passport.serializeUser((user: Express.User, done) => {
  done(null, user);
});

// Deserialize user
passport.deserializeUser((user: Express.User, done) => {
  done(null, user);
});

export default passport;
