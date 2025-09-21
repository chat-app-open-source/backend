import { Router } from 'express';
import passport from 'passport';
import { envConfig } from '../config';
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  logoutAll,
  passwordResetOTP,
  refreshToken,
  register,
  resendVerification,
  resetPasswordController as resetPassword,
  verifyEmail,
} from '../controllers';
import { authenticate, validate } from '../middlewares';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resendOTPSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyPasswordResetOTPSchema,
} from '../schemas';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/login', validate(loginSchema), login);
router.post('/resend-otp', validate(resendOTPSchema), resendVerification);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-password-reset-otp', validate(verifyPasswordResetOTPSchema), passwordResetOTP);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/logout', authenticate, validate(logoutSchema), logout);
router.post('/logout-all', authenticate, logoutAll);

// OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (_req, res) => {
    res.redirect(`${envConfig.clientUrl}/auth/callback?provider=google&success=true`);
  },
);

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  (_req, res) => {
    res.redirect(`${envConfig.clientUrl}/auth/callback?provider=facebook&success=true`);
  },
);

export default router;
