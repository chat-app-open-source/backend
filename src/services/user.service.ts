/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { z } from 'zod';
import logger from '../config/logger';
import { LoginAttempt, OTP, RefreshToken, User } from '../models';
import {
  deleteAccountSchema,
  rotateKeysSchema,
  searchUsersSchema,
  updateNotificationSchema,
  updatePrivacySchema,
  updateProfileSchema,
  updateSecuritySchema,
  updateStatusSchema,
} from '../schemas';
import { DeleteAccountResponse, TransformedUser } from '../types';
import { transformUserForResponse } from '../utils';
import { E2EEncryptionService } from './encryption.service';
import { PushNotificationService } from './pushNotification.service';

export const getUserProfile = async (userId: string): Promise<TransformedUser> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const user = await User.findById(userId).select(
    '-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes -verificationToken -resetPasswordToken -resetPasswordExpires',
  );

  if (!user) {
    throw new Error('User not found');
  }

  const transformedUser = transformUserForResponse(user);
  if (!transformedUser) {
    throw new Error('Failed to transform user data');
  }

  return transformedUser;
};

export const getUserById = async (userId: string): Promise<TransformedUser> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const user = await User.findById(userId).select(
    '-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes -verificationToken -resetPasswordToken -resetPasswordExpires',
  );

  if (!user) {
    throw new Error('User not found');
  }

  const transformedUser = transformUserForResponse(user);
  if (!transformedUser) {
    throw new Error('Failed to transform user data');
  }

  return transformedUser;
};

export const updateUserProfile = async (
  userId: string,
  data: z.infer<typeof updateProfileSchema>,
): Promise<TransformedUser> => {
  const validated = updateProfileSchema.parse(data);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if username is being changed and if it's already taken
  if (validated.username && validated.username !== user.username) {
    const existingUser = await User.findOne({
      username: validated.username,
      _id: { $ne: userId },
    });
    if (existingUser) {
      throw new Error('Username already taken');
    }
  }

  // Update only the provided fields
  const updateData: any = {};
  Object.keys(validated).forEach(key => {
    if (validated[key as keyof typeof validated] !== undefined) {
      updateData[key] = validated[key as keyof typeof validated];
    }
  });

  // Handle date conversion
  if (validated.dateOfBirth) {
    updateData.dateOfBirth = new Date(validated.dateOfBirth);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true },
  ).select('-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes');

  if (!updatedUser) {
    throw new Error('User not found');
  }

  logger.info('User profile updated successfully', {
    userId,
    updatedFields: Object.keys(validated),
  });

  const transformedUser = transformUserForResponse(updatedUser);
  if (!transformedUser) {
    throw new Error('Failed to transform user data');
  }

  return transformedUser;
};

export const updatePrivacySettings = async (
  userId: string,
  data: z.infer<typeof updatePrivacySchema>,
): Promise<TransformedUser> => {
  const validated = updatePrivacySchema.parse(data);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Update privacy settings
  const privacyUpdate: any = {};
  Object.keys(validated).forEach(key => {
    if (validated[key as keyof typeof validated] !== undefined) {
      privacyUpdate[`privacySettings.${key}`] = validated[key as keyof typeof validated];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: privacyUpdate },
    { new: true, runValidators: true },
  ).select('-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes');

  if (!updatedUser) {
    throw new Error('User not found');
  }

  logger.info('Privacy settings updated successfully', { userId });

  const transformedUser = transformUserForResponse(updatedUser);
  if (!transformedUser) {
    throw new Error('Failed to transform user data');
  }

  return transformedUser;
};

export const updateNotificationSettings = async (
  userId: string,
  data: z.infer<typeof updateNotificationSchema>,
): Promise<TransformedUser> => {
  const validated = updateNotificationSchema.parse(data);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Update notification settings
  const notificationUpdate: any = {};
  Object.keys(validated).forEach(key => {
    if (validated[key as keyof typeof validated] !== undefined) {
      notificationUpdate[`notificationSettings.${key}`] = validated[key as keyof typeof validated];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: notificationUpdate },
    { new: true, runValidators: true },
  ).select('-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes');

  if (!updatedUser) {
    throw new Error('User not found');
  }

  logger.info('Notification settings updated successfully', { userId });

  const transformedUser = transformUserForResponse(updatedUser);
  if (!transformedUser) {
    throw new Error('Failed to transform user data');
  }

  return transformedUser;
};

export const updateSecuritySettings = async (
  userId: string,
  data: z.infer<typeof updateSecuritySchema>,
): Promise<TransformedUser> => {
  const validated = updateSecuritySchema.parse(data);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Update security settings
  const securityUpdate: any = {};
  Object.keys(validated).forEach(key => {
    if (validated[key as keyof typeof validated] !== undefined) {
      securityUpdate[`securitySettings.${key}`] = validated[key as keyof typeof validated];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: securityUpdate },
    { new: true, runValidators: true },
  ).select('-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes');

  if (!updatedUser) {
    throw new Error('User not found');
  }

  logger.info('Security settings updated successfully', { userId });

  const transformedUser = transformUserForResponse(updatedUser);
  if (!transformedUser) {
    throw new Error('Failed to transform user data');
  }

  return transformedUser;
};

export const updateOnlineStatus = async (
  userId: string,
  data: z.infer<typeof updateStatusSchema>,
): Promise<TransformedUser> => {
  const validated = updateStatusSchema.parse(data);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        status: validated.status,
        lastSeen: new Date(),
      },
    },
    { new: true, runValidators: true },
  ).select('-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes');

  if (!updatedUser) {
    throw new Error('User not found');
  }

  logger.info('User status updated successfully', {
    userId,
    status: validated.status,
  });

  const transformedUser = transformUserForResponse(updatedUser);
  if (!transformedUser) {
    throw new Error('Failed to transform user data');
  }

  return transformedUser;
};

export const deleteUserAccount = async (
  userId: string,
  data: z.infer<typeof deleteAccountSchema>,
): Promise<DeleteAccountResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    // Clean up user data across collections
    await Promise.all([
      // Revoke all refresh tokens
      RefreshToken.updateMany({ userId: user._id }, { isRevoked: true }, { session }),
      // Clean up login attempts
      LoginAttempt.deleteMany({ userId: user._id }, { session }),
      // Clean up OTPs
      OTP.deleteMany({ email: user.email }, { session }),
    ]);

    // Unsubscribe from all topics for device tokens
    for (const deviceToken of user.deviceTokens) {
      try {
        await PushNotificationService.unsubscribeFromTopic(userId, deviceToken.token, 'all_users');
        await PushNotificationService.unsubscribeFromTopic(
          userId,
          deviceToken.token,
          `platform_${deviceToken.platform}`,
        );
      } catch (error) {
        logger.warn('Failed to unsubscribe from topics during account deletion', {
          userId,
          deviceToken: `${deviceToken.token.substring(0, 10)}...`,
          error: (error as Error).message,
        });
      }
    }

    // Delete the user
    await User.deleteOne({ _id: userId }).session(session);

    await session.commitTransaction();

    logger.warn('User account deleted permanently', {
      userId,
      email: user.email,
      reason: data.reason,
    });

    return {
      message: "Account deleted successfully. We're sorry to see you go.",
      deleted: true,
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error('Account deletion failed', {
      userId,
      error: (error as Error).message,
    });
    throw error;
  } finally {
    session.endSession();
  }
};

export const rotateE2EKeys = async (userId: string, currentPassword: string): Promise<void> => {
  const validated = rotateKeysSchema.parse({ currentPassword });

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const user = await User.findById(userId).select('+password +privateKeyEncrypted +keySalt');
  if (!user || !user.password) {
    throw new Error('User not found or no password set');
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(validated.currentPassword);
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Check if user has existing E2E encryption
  if (!user.privateKeyEncrypted || !user.keySalt) {
    throw new Error('E2E encryption not set up for this account');
  }

  try {
    // Generate new key pair
    const { publicKey, privateKey } = await E2EEncryptionService.generateKeyPair();
    const { encrypted, salt } = await E2EEncryptionService.encryptPrivateKey(
      privateKey,
      validated.currentPassword,
    );

    // Update user with new keys
    await User.findByIdAndUpdate(userId, {
      $set: {
        publicKey,
        privateKeyEncrypted: encrypted,
        keySalt: salt,
        'encryptionSettings.lastKeyRotation': new Date(),
      },
    });

    logger.info('E2E encryption keys rotated successfully', { userId });
  } catch (error) {
    logger.error('E2E key rotation failed', {
      userId,
      error: (error as Error).message,
    });
    throw new Error('Failed to rotate encryption keys');
  }
};

export const searchUsers = async (
  query: string,
  limit: number = 20,
): Promise<TransformedUser[]> => {
  const validated = searchUsersSchema.parse({ q: query, limit });

  if (!validated.q || validated.q.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters long');
  }

  const searchRegex = new RegExp(validated.q, 'i');

  const users = await User.find({
    $or: [
      { username: searchRegex },
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
    ],
    isVerified: true,
  })
    .select(
      '-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes -verificationToken -resetPasswordToken -resetPasswordExpires',
    )
    .limit(validated.limit)
    .sort({ username: 1 });

  logger.info('User search performed', {
    query: validated.q,
    limit: validated.limit,
    results: users.length,
  });

  const transformedUsers = users.map(user => {
    const transformed = transformUserForResponse(user);
    if (!transformed) {
      throw new Error('Failed to transform user data');
    }
    return transformed;
  });

  return transformedUsers;
};

export const updateProfilePicture = async (
  userId: string,
  profilePictureUrl: string,
): Promise<TransformedUser> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { profilePicture: profilePictureUrl } },
    { new: true, runValidators: true },
  ).select('-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes');

  if (!updatedUser) {
    throw new Error('User not found');
  }

  logger.info('Profile picture updated successfully', { userId });

  const transformedUser = transformUserForResponse(updatedUser);
  if (!transformedUser) {
    throw new Error('Failed to transform user data');
  }

  return transformedUser;
};

export const updateCoverPhoto = async (
  userId: string,
  coverPhotoUrl: string,
): Promise<TransformedUser> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { coverPhoto: coverPhotoUrl } },
    { new: true, runValidators: true },
  ).select('-password -privateKeyEncrypted -keySalt -twoFactorSecret -twoFactorBackupCodes');

  if (!updatedUser) {
    throw new Error('User not found');
  }

  logger.info('Cover photo updated successfully', { userId });

  const transformedUser = transformUserForResponse(updatedUser);
  if (!transformedUser) {
    throw new Error('Failed to transform user data');
  }

  return transformedUser;
};
