/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import passport from 'passport';

import { envConfig } from '../config/env';
import logger from '../config/logger';
import {
  changePassword,
  facebookCallback,
  forgotPassword,
  googleCallback,
  login,
  logout,
  logoutAll,
  passwordResetOTP,
  refreshToken,
  register,
  resendVerification,
  resetPasswordController as resetPassword,
  subscribeTopic,
  unsubscribeTopic,
  verify2FALogin,
  verifyEmail,
} from '../controllers';
import {
  authenticate,
  detectPlatform,
  generateOAuthState,
  validate,
  validateOAuthState,
} from '../middlewares';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resendOTPSchema,
  resetPasswordSchema,
  subscribeTopicSchema,
  unsubscribeTopicSchema,
  verify2FALoginSchema,
  verifyEmailSchema,
  verifyPasswordResetOTPSchema,
} from '../schemas';

const router = Router();

// Apply platform detection to all routes
router.use(detectPlatform);

// Regular auth routes
router.post('/register', validate(registerSchema), register);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/login', validate(loginSchema), login);
router.post('/verify-2fa-login', validate(verify2FALoginSchema), verify2FALogin);
router.post('/resend-otp', validate(resendOTPSchema), resendVerification);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-password-reset-otp', validate(verifyPasswordResetOTPSchema), passwordResetOTP);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/logout', authenticate, validate(logoutSchema), logout);
router.post('/logout-all', authenticate, validate(logoutSchema), logoutAll);
router.post('/subscribe-topic', authenticate, validate(subscribeTopicSchema), subscribeTopic);
router.post('/unsubscribe-topic', authenticate, validate(unsubscribeTopicSchema), unsubscribeTopic);

// Platform-aware OAuth routes
router.get('/google', (req: any, res: any, next: any) => {
  const platformReq = req as any;
  const platform = platformReq.platform || 'web';
  const state = generateOAuthState(platformReq);

  logger.info(`🔐 Google OAuth initiated from ${platform}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    stateLength: state.length,
  });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${envConfig.clientUrl}/login?error=google_auth_failed`,
  }),
  (req: any, res: any, next: any) => {
    const platformReq = req as any;

    if (req.query.state) {
      const stateValid = validateOAuthState(platformReq, req.query.state as string);
      if (!stateValid) {
        logger.warn('Google OAuth state validation failed', {
          ip: req.ip,
          userAgent: req.headers['user-agent']?.substring(0, 100),
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OAuth state',
          error: 'STATE_INVALID',
        });
      }
    }

    logger.info('Google OAuth state validated successfully', {
      platform: platformReq.platform,
      ip: req.ip,
    });

    return next();
  },
  googleCallback,
);

router.get('/facebook', (req: any, res: any, next: any) => {
  const platformReq = req as any;
  const platform = platformReq.platform || 'web';
  const state = generateOAuthState(platformReq);

  logger.info(`🔐 Facebook OAuth initiated from ${platform}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    stateLength: state.length,
  });

  passport.authenticate('facebook', {
    scope: ['email'],
    state,
  })(req, res, next);
});

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    session: false,
    failureRedirect: `${envConfig.clientUrl}/login?error=facebook_auth_failed`,
  }),
  (req: any, res: any, next: any) => {
    const platformReq = req as any;

    if (req.query.state) {
      const stateValid = validateOAuthState(platformReq, req.query.state as string);
      if (!stateValid) {
        logger.warn('Facebook OAuth state validation failed', {
          ip: req.ip,
          userAgent: req.headers['user-agent']?.substring(0, 100),
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OAuth state',
          error: 'STATE_INVALID',
        });
      }
    }

    logger.info('Facebook OAuth state validated successfully', {
      platform: platformReq.platform,
      ip: req.ip,
    });

    return next();
  },
  facebookCallback,
);

// Platform info endpoint (for testing)
router.get('/platform-info', (req: any, res: any) => {
  const platformReq = req as any;

  res.json({
    platform: platformReq.platform || 'unknown',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    oauthState: platformReq.oauthState,
    timestamp: new Date().toISOString(),
    detectedFrom: req.headers['user-agent'] || 'unknown',
  });
});

export default router;
