import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import {
  deleteUserAccount,
  getUserById,
  getUserProfile,
  rotateE2EKeys,
  searchUsers,
  updateCoverPhoto,
  updateNotificationSettings,
  updateOnlineStatus,
  updatePrivacySettings,
  updateProfilePicture,
  updateSecuritySettings,
  updateUserProfile,
} from '../services/user.service';
import { errorResponse, successResponse } from '../utils';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const user = await getUserProfile(userId);

    return successResponse({
      res,
      message: 'Profile retrieved successfully',
      data: { user },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get profile error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const getProfileById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const user = await getUserById(userId);

    return successResponse({
      res,
      message: 'User profile retrieved successfully',
      data: { user },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get profile by ID error', {
      error: err.message,
      userId: req.params.userId,
    });
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const user = await updateUserProfile(userId, req.body);

    return successResponse({
      res,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Update profile error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const updatePrivacy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const user = await updatePrivacySettings(userId, req.body);

    return successResponse({
      res,
      message: 'Privacy settings updated successfully',
      data: { privacySettings: user.privacySettings },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Update privacy settings error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const updateNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const user = await updateNotificationSettings(userId, req.body);

    return successResponse({
      res,
      message: 'Notification settings updated successfully',
      data: { notificationSettings: user.notificationSettings },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Update notification settings error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const updateSecurity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const user = await updateSecuritySettings(userId, req.body);

    return successResponse({
      res,
      message: 'Security settings updated successfully',
      data: { securitySettings: user.securitySettings },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Update security settings error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const setStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const user = await updateOnlineStatus(userId, req.body);

    return successResponse({
      res,
      message: 'Status updated successfully',
      data: {
        status: user.status,
        lastSeen: user.lastSeen,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Set status error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const result = await deleteUserAccount(userId, req.body);

    return successResponse({
      res,
      message: result.message,
      data: { deleted: true },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Delete account error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const rotateKeys = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const { currentPassword } = req.body;

    await rotateE2EKeys(userId, currentPassword);

    return successResponse({
      res,
      message: 'Encryption keys rotated successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Rotate keys error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q: query, limit } = req.query;

    const users = await searchUsers(query as string, limit ? Number(limit) : 20);

    return successResponse({
      res,
      message: 'Users found successfully',
      data: {
        users,
        query,
        count: users.length,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Search users error', {
      error: err.message,
      query: req.query.q,
    });
    next(error);
  }
};

export const updateProfilePictureController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const { profilePictureUrl } = req.body;

    if (!profilePictureUrl) {
      return errorResponse({
        res,
        message: 'Profile picture URL is required',
        statusCode: 400,
      });
    }

    const user = await updateProfilePicture(userId, profilePictureUrl);

    return successResponse({
      res,
      message: 'Profile picture updated successfully',
      data: { user },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Update profile picture error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

export const updateCoverPhotoController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const { coverPhotoUrl } = req.body;

    if (!coverPhotoUrl) {
      return errorResponse({
        res,
        message: 'Cover photo URL is required',
        statusCode: 400,
      });
    }

    const user = await updateCoverPhoto(userId, coverPhotoUrl);

    return successResponse({
      res,
      message: 'Cover photo updated successfully',
      data: { user },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Update cover photo error', {
      error: err.message,
      userId: req.user?.id,
    });
    next(error);
  }
};
