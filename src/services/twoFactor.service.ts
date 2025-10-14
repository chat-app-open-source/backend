import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import logger from '../config/logger';
import { redisClient } from '../config/redis';
import { User } from '../models';
import type { TwoFactorSetup, TwoFactorVerification } from '../types';
import { sendEmail } from './email.service';

export class TwoFactorService {
  private static readonly BACKUP_CODE_COUNT = 8;
  private static readonly BACKUP_CODE_LENGTH = 10;
  private static readonly TEMP_SECRET_EXPIRY = 600;

  // Generate 2FA secret and QR code
  static async enable2FA(userId: string): Promise<TwoFactorSetup> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.twoFactorEnabled) {
        throw new Error('2FA is already enabled');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `ChatApp (${user.email})`,
        issuer: 'ChatApp',
        length: 20,
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store secret temporarily in Redis (will be permanent after verification)
      await redisClient.set(
        `2fa_temp:${userId}`,
        JSON.stringify({
          secret: secret.base32,
          backupCodes,
        }),
        this.TEMP_SECRET_EXPIRY,
      );

      logger.info('2FA setup initiated', {
        userId,
        email: user.email,
        tempSecretStored: true,
      });

      return {
        secret: secret.base32, // For manual entry if QR code fails
        qrCode,
        backupCodes,
      };
    } catch (error) {
      logger.error('2FA setup failed', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Verify and enable 2FA
  static async verifyAndEnable2FA(userId: string, token: string): Promise<TwoFactorVerification> {
    try {
      // Get temporary secret from Redis
      const tempData = await redisClient.get(`2fa_temp:${userId}`);
      if (!tempData) {
        throw new Error('2FA setup session expired. Please start the setup process again.');
      }

      const { secret, backupCodes } = JSON.parse(tempData);

      // Verify token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: token.replace(/\s/g, ''), // Remove spaces if any
        window: 2, // Allow 1 minute before and after
      });

      if (!verified) {
        throw new Error('Invalid verification code. Please check the code and try again.');
      }

      // Enable 2FA for user in database
      const user = await User.findByIdAndUpdate(
        userId,
        {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          twoFactorBackupCodes: backupCodes,
        },
        { new: true },
      );

      if (!user) {
        throw new Error('User not found during 2FA activation');
      }

      // Clear temporary data from Redis
      await redisClient.del(`2fa_temp:${userId}`);

      // Send confirmation email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Two-Factor Authentication Enabled - ChatApp',
          template: '2faEnabled',
          context: {
            username: user.username,
            backupCodes,
            title: 'Two-Factor Authentication Enabled',
            currentYear: new Date().getFullYear(),
            appName: 'ChatApp',
          },
        });
        logger.info('2FA enabled email sent', { userId, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send 2FA enabled email', {
          userId,
          error: (emailError as Error).message,
        });
        // Don't throw error, just log it
      }

      logger.info('2FA enabled successfully', {
        userId,
        email: user.email,
        backupCodesCount: backupCodes.length,
      });

      return {
        success: true,
        backupCodes,
      };
    } catch (error) {
      logger.error('2FA verification failed', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Verify 2FA token during login
  static async verify2FAToken(userId: string, token: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('+twoFactorSecret +twoFactorBackupCodes');

      if (!user || !user.twoFactorEnabled) {
        throw new Error('2FA not enabled for user');
      }

      if (!user.twoFactorSecret) {
        throw new Error('2FA secret not found');
      }

      // Clean the token (remove spaces)
      const cleanToken = token.replace(/\s/g, '');

      // Check backup codes first
      if (user.twoFactorBackupCodes?.includes(cleanToken)) {
        // Remove used backup code
        const updatedBackupCodes = user.twoFactorBackupCodes.filter(code => code !== cleanToken);
        await User.findByIdAndUpdate(userId, {
          twoFactorBackupCodes: updatedBackupCodes,
        });

        logger.info('2FA backup code used successfully', {
          userId,
          remainingBackupCodes: updatedBackupCodes.length,
        });
        return true;
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: cleanToken,
        window: 2, // Allow 1 minute before and after
      });

      if (verified) {
        logger.info('2FA token verified successfully', { userId });
      } else {
        logger.warn('2FA token verification failed', { userId });
      }

      return verified;
    } catch (error) {
      logger.error('2FA token verification error', {
        userId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  // Disable 2FA
  static async disable2FA(userId: string): Promise<void> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          twoFactorEnabled: false,
          twoFactorSecret: undefined,
          twoFactorBackupCodes: undefined,
        },
        { new: true },
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Clear any temporary data
      await redisClient.del(`2fa_temp:${userId}`);

      // Send confirmation email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Two-Factor Authentication Disabled - ChatApp',
          template: '2faDisabled',
          context: {
            username: user.username,
            title: 'Two-Factor Authentication Disabled',
            currentYear: new Date().getFullYear(),
            appName: 'ChatApp',
          },
        });
        logger.info('2FA disabled email sent', { userId, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send 2FA disabled email', {
          userId,
          error: (emailError as Error).message,
        });
      }

      logger.info('2FA disabled successfully', { userId, email: user.email });
    } catch (error) {
      logger.error('2FA disable failed', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Generate new backup codes
  static async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.twoFactorEnabled) {
        throw new Error('2FA not enabled for user');
      }

      const backupCodes = this.generateBackupCodes();

      await User.findByIdAndUpdate(userId, {
        twoFactorBackupCodes: backupCodes,
      });

      // Send email with new backup codes
      try {
        await sendEmail({
          to: user.email,
          subject: 'New Backup Codes Generated - ChatApp',
          template: 'newBackupCodes',
          context: {
            username: user.username,
            backupCodes,
            title: 'New Backup Codes Generated',
            currentYear: new Date().getFullYear(),
            appName: 'ChatApp',
          },
        });
        logger.info('New backup codes email sent', { userId, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send new backup codes email', {
          userId,
          error: (emailError as Error).message,
        });
      }

      logger.info('New backup codes generated successfully', {
        userId,
        backupCodesCount: backupCodes.length,
      });
      return backupCodes;
    } catch (error) {
      logger.error('Backup codes generation failed', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Check if 2FA is enabled for user
  static async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('twoFactorEnabled');
      return user?.twoFactorEnabled || false;
    } catch (error) {
      logger.error('Failed to check 2FA status', {
        userId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  // Get remaining backup codes count
  static async getRemainingBackupCodes(userId: string): Promise<number> {
    try {
      const user = await User.findById(userId).select('twoFactorBackupCodes');
      return user?.twoFactorBackupCodes?.length || 0;
    } catch (error) {
      logger.error('Failed to get backup codes count', {
        userId,
        error: (error as Error).message,
      });
      return 0;
    }
  }

  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      let code = '';
      for (let j = 0; j < this.BACKUP_CODE_LENGTH; j++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      // Format as XXXX-XXXX for better readability
      const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
      codes.push(formattedCode);
    }

    return codes;
  }
}
