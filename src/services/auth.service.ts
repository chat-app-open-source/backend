import { z } from 'zod';
import { logger } from '../config';
import { IUserDocument, OTP, RefreshToken, User } from '../models';
import { forgotPasswordSchema, loginSchema, registerSchema } from '../schemas';
import { IAuthTokens } from '../types';
import { sendEmail } from './email.service';
import { checkOTPStatus, generateOTP, resendOTP, storeOTP, verifyOTP } from './otp.service';

export const registerUser = async (
  data: z.infer<typeof registerSchema>,
): Promise<{ user: IUserDocument; otpSent: boolean }> => {
  try {
    const validatedData = registerSchema.parse(data);
    const existingUser = await User.findOne({
      $or: [{ email: validatedData.email }, { username: validatedData.username }],
    });

    if (existingUser) {
      throw new Error(
        existingUser.email === validatedData.email
          ? 'Email already exists'
          : 'Username already exists',
      );
    }

    const user = new User({
      ...validatedData,
      dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
      isVerified: false,
    });

    await user.save();

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(validatedData.email, otp, 'email_verification');

    // Send email
    try {
      await sendEmail({
        to: validatedData.email,
        subject: 'Verify Your Email - Chat App',
        template: 'verifyEmail',
        context: {
          otp,
          userName: validatedData.username,
          expiry: '10 minutes',
          title: 'Email Verification',
          subtitle: 'Secure your ChatApp account',
          currentYear: new Date().getFullYear(),
        },
      });
    } catch (emailError) {
      logger.error('Failed to send verification email', {
        userId: user._id,
        error: (emailError as Error).message,
      });
      // Don't fail registration if email fails, just log it
    }

    logger.info('User registered successfully', { userId: user._id, email: validatedData.email });
    return { user, otpSent: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0].message}`);
    }
    logger.error('Registration failed', { error });
    throw error;
  }
};

export const verifyEmailOTP = async (email: string, otp: string): Promise<IUserDocument> => {
  const isValid = await verifyOTP(email, otp, 'email_verification');
  if (!isValid) {
    throw new Error('Invalid or expired OTP');
  }

  const user = await User.findOneAndUpdate(
    { email },
    { isVerified: true },
    { new: true, select: '-password' },
  );

  if (!user) {
    throw new Error('User not found');
  }

  // Clean up used OTP
  await OTP.deleteOne({ email, type: 'email_verification' });

  logger.info('Email verified successfully', { userId: user._id, email });
  return user;
};

export const loginUser = async (
  data: z.infer<typeof loginSchema>,
): Promise<{
  user: IUserDocument;
  tokens: IAuthTokens;
  otpStatus?: { resent: boolean; message: string };
}> => {
  try {
    const validatedData = loginSchema.parse(data);
    const user = await User.findOne({ email: validatedData.email }).select('+password');

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.password) {
      throw new Error('This account uses OAuth. Please login with Google or Facebook.');
    }

    const isPasswordValid = await user.comparePassword(validatedData.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Check email verification status
    if (!user.isVerified) {
      // Check OTP status
      const otpStatus = await checkOTPStatus(validatedData.email, 'email_verification');

      let resentMessage = '';

      if (!otpStatus.exists || otpStatus.isExpired || otpStatus.isUsed) {
        // Resend OTP if it doesn't exist, expired, or used
        try {
          const emailSent = await resendOTP(
            validatedData.email,
            'email_verification',
            user,
            user.username,
          );
          resentMessage = emailSent
            ? 'A new verification code has been sent to your email.'
            : 'A new verification code has been generated. Please check your email service configuration.';
        } catch (resendError) {
          logger.error('Auto-resend OTP failed during login', {
            userId: user._id,
            email: validatedData.email,
            error: (resendError as Error).message,
          });
          resentMessage =
            'Verification code generation failed. Please try again or contact support.';
        }
      } else if (otpStatus.isValid) {
        // OTP exists and is valid
        resentMessage = `Your verification code expires in ${Math.ceil(
          (otpStatus.expiresAt!.getTime() - Date.now()) / (1000 * 60),
        )} minutes.`;
      }

      // Throw error with helpful message
      const errorMessage = otpStatus.isValid
        ? `Please verify your email first. ${resentMessage}`
        : `Please verify your email first. ${resentMessage}`;

      throw new Error(errorMessage);
    }

    // User is verified, generate tokens
    const { generateTokens } = await import('./token.service');
    const tokens = await generateTokens(user.id.toString());

    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    logger.info('User logged in successfully', { userId: user._id, email: validatedData.email });
    return { user, tokens };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0].message}`);
    }
    logger.error('Login failed', { error });
    throw error;
  }
};

export const forgotPassword = async (
  email: string,
): Promise<{ otpSent: boolean; message: string }> => {
  try {
    const validatedEmail = forgotPasswordSchema.parse({ email });

    const user = await User.findOne({ email: validatedEmail.email });
    if (!user) {
      // Don't reveal if user exists - security best practice
      logger.info('Password reset requested for non-existent email', {
        email: validatedEmail.email,
      });
      return { otpSent: false, message: 'If an account exists, a reset link has been sent.' };
    }

    // Check existing OTP status
    const otpStatus = await checkOTPStatus(validatedEmail.email, 'password_reset');

    let otpSent = false;
    let message = '';

    if (!otpStatus.exists || otpStatus.isExpired || otpStatus.isUsed) {
      // Generate new OTP if needed
      try {
        otpSent = await resendOTP(validatedEmail.email, 'password_reset', user);
        message = otpSent
          ? 'Password reset code sent to your email.'
          : 'Password reset code generated. Please check your email service configuration.';
      } catch (resendError) {
        logger.error('Resend OTP failed during forgot password', {
          userId: user._id,
          email: validatedEmail.email,
          error: (resendError as Error).message,
        });
        message = 'Failed to generate reset code. Please try again.';
        otpSent = false;
      }
    } else {
      // OTP exists and is valid
      otpSent = true;
      message = `Your password reset code expires in ${Math.ceil(
        (otpStatus.expiresAt!.getTime() - Date.now()) / (1000 * 60),
      )} minutes.`;
    }

    logger.info('Password reset processed', {
      userId: user._id,
      email: validatedEmail.email,
      otpSent,
      otpStatus: otpStatus.isValid ? 'valid' : otpStatus.isExpired ? 'expired' : 'none',
    });
    return { otpSent, message };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0].message}`);
    }
    logger.error('Forgot password failed', { error });
    throw error;
  }
};

export const verifyPasswordResetOTP = async (email: string, otp: string): Promise<boolean> => {
  const isValid = await verifyOTP(email, otp, 'password_reset');
  if (!isValid) {
    throw new Error('Invalid or expired OTP');
  }

  logger.info('Password reset OTP verified', { email });
  return true;
};

export const resetPassword = async (email: string, newPassword: string): Promise<void> => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new Error('User not found');
  }

  user.password = newPassword;
  await user.save();

  // Clean up OTP
  await OTP.deleteOne({ email, type: 'password_reset' });

  logger.info('Password reset successfully', { userId: user._id, email });
};

export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await User.findById(userId).select('+password');
  if (!user || !user.password) {
    throw new Error('User not found or no password set');
  }

  const isOldPasswordValid = await user.comparePassword(oldPassword);
  if (!isOldPasswordValid) {
    throw new Error('Old password is incorrect');
  }

  // Check if new password is the same as old
  if (await user.comparePassword(newPassword)) {
    throw new Error('New password cannot be the same as old password');
  }

  user.password = newPassword;
  await user.save();

  logger.info('Password changed successfully', { userId });
};

export const resendVerificationEmail = async (
  email: string,
  otpType: 'email_verification' | 'password_reset' = 'email_verification',
): Promise<{ otpSent: boolean; message: string }> => {
  try {
    const validatedEmail = z.string().email('Invalid email address').parse(email);
    const user = await User.findOne({ email: validatedEmail });

    if (!user) {
      return {
        otpSent: false,
        message: 'If an account exists, a verification email has been sent.',
      };
    }

    if (user.isVerified) {
      return {
        otpSent: false,
        message: 'Email already verified.',
      };
    }

    // Check OTP status
    const otpStatus = await checkOTPStatus(validatedEmail, otpType);

    let otpSent = false;
    let message = '';

    if (!otpStatus.exists || otpStatus.isExpired || otpStatus.isUsed) {
      try {
        otpSent = await resendOTP(validatedEmail, otpType, user);
        message = otpSent
          ? 'Verification code sent to your email.'
          : 'Verification code generated. Please check your email service configuration.';
      } catch (resendError) {
        logger.error('Resend verification email failed', {
          userId: user._id,
          email: validatedEmail,
          error: (resendError as Error).message,
        });
        message = 'Failed to send verification email. Please try again.';
        otpSent = false;
      }
    } else {
      otpSent = true;
      message = `Your verification code expires in ${Math.ceil(
        (otpStatus.expiresAt!.getTime() - Date.now()) / (1000 * 60),
      )} minutes.`;
    }

    logger.info('Verification email resent', {
      userId: user._id,
      email: validatedEmail,
      otpSent,
    });
    return { otpSent, message };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.issues[0].message}`);
    }
    logger.error('Resend verification failed', { error });
    throw error;
  }
};

export const logoutAllDevices = async (
  userId: string,
): Promise<{ message: string; revokedCount: number }> => await logoutUser(userId, undefined, true);

export const logoutCurrentDevice = async (
  userId: string,
  refreshToken: string,
): Promise<{ message: string; revokedCount: number }> =>
  await logoutUser(userId, refreshToken, false);

export const logoutUser = async (
  userId: string,
  refreshToken?: string,
  revokeAll: boolean = true,
): Promise<{ message: string; revokedCount: number }> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let revokedCount = 0;

    if (revokeAll) {
      // Revoke ALL active refresh tokens for this user
      const result = await RefreshToken.updateMany(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
      revokedCount = result.modifiedCount;

      logger.info('All refresh tokens revoked for user', {
        userId,
        email: user.email,
        revokedCount,
      });
    } else if (refreshToken) {
      // Revoke specific refresh token only
      const result = await RefreshToken.findOneAndUpdate(
        {
          token: refreshToken,
          userId,
          isRevoked: false,
        },
        { isRevoked: true },
      );

      if (result) {
        revokedCount = 1;
        logger.info('Specific refresh token revoked', {
          userId,
          email: user.email,
          tokenPrefix: `${refreshToken.substring(0, 20)}...`,
        });
      } else {
        logger.warn('Refresh token not found or already revoked', {
          userId,
          tokenPrefix: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'none',
        });
      }
    }

    // Update user status to offline
    user.status = 'offline';
    user.lastSeen = new Date();
    await user.save();

    logger.info('User logged out successfully', {
      userId,
      email: user.email,
      revokedCount,
      method: revokeAll ? 'all_tokens' : 'specific_token',
    });

    return {
      message: revokeAll
        ? 'Logged out successfully. All sessions have been terminated.'
        : 'Current session has been terminated.',
      revokedCount,
    };
  } catch (error) {
    logger.error('Logout failed', {
      userId,
      error: (error as Error).message,
    });
    throw error;
  }
};
