import crypto from 'crypto';

import { envConfig } from '../config/env';
import logger from '../config/logger';
import { OTP } from '../models';

import { IUserDocument } from '../types';
import { sendEmail } from './email.service';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

export const generateOTP = (): string =>
  crypto.randomInt(Math.pow(10, OTP_LENGTH - 1), Math.pow(10, OTP_LENGTH)).toString();

export const storeOTP = async (
  email: string,
  otp: string,
  type: 'email_verification' | 'password_reset',
): Promise<void> => {
  try {
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OTP.findOneAndUpdate(
      { email, type },
      {
        otp,
        expiresAt,
        used: false,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    logger.debug('OTP stored successfully', { email, type, otp: `${otp}***` });
  } catch (error) {
    logger.error('Failed to store OTP', { email, type, error: (error as Error).message });
    throw new Error('Failed to generate OTP');
  }
};

export const verifyOTP = async (
  email: string,
  otp: string,
  type: 'email_verification' | 'password_reset',
): Promise<boolean> => {
  try {
    const storedOtp = await OTP.findOne({
      email,
      type,
      otp,
      used: false,
    });

    if (!storedOtp) {
      logger.warn('OTP not found', { email, type });
      return false;
    }

    if (storedOtp.expiresAt < new Date()) {
      logger.warn('OTP expired', { email, type });
      await OTP.findByIdAndUpdate(storedOtp._id, { used: true });
      return false;
    }

    // Mark as used
    await OTP.findByIdAndUpdate(storedOtp._id, { used: true });

    logger.info('OTP verified successfully', { email, type });
    return true;
  } catch (error) {
    logger.error('OTP verification failed', { email, type, error: (error as Error).message });
    return false;
  }
};

interface OTPStatus {
  exists: boolean;
  isValid: boolean;
  isExpired: boolean;
  isUsed: boolean;
  expiresAt?: Date;
}

// Helper function to check OTP status
export const checkOTPStatus = async (
  email: string,
  type: 'email_verification' | 'password_reset',
): Promise<OTPStatus> => {
  const otpDoc = await OTP.findOne({ email, type, used: false });

  if (!otpDoc) {
    return { exists: false, isValid: false, isExpired: false, isUsed: false };
  }

  const isExpired = otpDoc.expiresAt < new Date();
  const isUsed = otpDoc.used;

  return {
    exists: true,
    isValid: !isExpired && !isUsed,
    isExpired,
    isUsed,
    expiresAt: otpDoc.expiresAt,
  };
};

// Resend OTP helper function
export const resendOTP = async (
  email: string,
  type: 'email_verification' | 'password_reset',
  user?: IUserDocument,
  username?: string,
): Promise<boolean> => {
  try {
    // Delete old OTPs
    await OTP.deleteMany({ email, type });

    // Generate new OTP
    const otp = generateOTP();
    await storeOTP(email, otp, type);

    // Prepare email context
    const emailContext = {
      to: email,
      subject:
        type === 'email_verification'
          ? 'Verify Your Email - Chat App'
          : 'Password Reset OTP - Chat App',
      template: type === 'email_verification' ? 'verifyEmail' : 'resetPassword',
      context: {
        otp,
        userName: username || user?.username || email.split('@')[0],
        expiry: '10 minutes',
        title: type === 'email_verification' ? 'Email Verification' : 'Password Reset',
        subtitle:
          type === 'email_verification'
            ? 'Secure your ChatApp account'
            : 'Reset your ChatApp password',
        currentYear: new Date().getFullYear(),
        appName: envConfig.fromName,
        supportEmail: envConfig.fromEmail,
      },
    };

    // Send email
    let emailSent = false;
    try {
      await sendEmail(emailContext);
      emailSent = true;
      logger.info(`${type} email sent successfully`, {
        email,
        userId: user?._id,
      });
    } catch (emailError) {
      logger.error(`Failed to send ${type} email`, {
        userId: user?._id,
        error: (emailError as Error).message,
        email,
      });
      emailSent = false;
    }

    logger.info(`New ${type} generated and stored`, {
      email,
      userId: user?._id,
      otpSent: emailSent,
    });
    return emailSent;
  } catch (error) {
    logger.error(`Failed to resend ${type}`, {
      email,
      userId: user?._id,
      error: (error as Error).message,
    });
    throw error;
  }
};
