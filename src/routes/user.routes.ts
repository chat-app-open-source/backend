import { Router } from 'express';
import {
  deleteAccount,
  getProfile,
  getProfileById,
  rotateKeys,
  search,
  setStatus,
  updateCoverPhotoController,
  updateNotifications,
  updatePrivacy,
  updateProfile,
  updateProfilePictureController,
  updateSecurity,
} from '../controllers/user.controller';
import { authenticate, validate } from '../middlewares';
import {
  deleteAccountSchema,
  getUserByIdSchema,
  rotateKeysSchema,
  updateNotificationSchema,
  updatePrivacySchema,
  updateProfileSchema,
  updateSecuritySchema,
  updateStatusSchema,
} from '../schemas/user.schema';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', getProfile);
router.get('/search', search);
router.get('/:userId', validate(getUserByIdSchema), getProfileById);
router.patch('/profile', validate(updateProfileSchema), updateProfile);

// Settings routes
router.patch('/privacy', validate(updatePrivacySchema), updatePrivacy);
router.patch('/notifications', validate(updateNotificationSchema), updateNotifications);
router.patch('/security', validate(updateSecuritySchema), updateSecurity);
router.patch('/status', validate(updateStatusSchema), setStatus);

// Media routes
router.patch('/profile-picture', updateProfilePictureController);
router.patch('/cover-photo', updateCoverPhotoController);

// Account management
router.post('/rotate-keys', validate(rotateKeysSchema), rotateKeys);
router.delete('/account', validate(deleteAccountSchema), deleteAccount);

export default router;
