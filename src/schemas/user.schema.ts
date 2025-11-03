import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must not exceed 20 characters')
      .trim()
      .optional(),
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must not exceed 50 characters')
      .trim()
      .optional(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must not exceed 50 characters')
      .trim()
      .optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z
      .string()
      .optional()
      .refine(val => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid date of birth',
      }),
    gender: z.enum(['male', 'female', 'other']).optional(),
    language: z.string().optional(),
    country: z.string().optional(),
    bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
    profilePicture: z.string().optional(),
    coverPhoto: z.string().optional(),
  })
  .refine(
    data => {
      const filled = Object.values(data).filter(v => v !== undefined && v !== '');
      return filled.length > 0;
    },
    { message: 'At least one field must be provided to update.' },
  );

export const updatePrivacySchema = z.object({
  lastSeen: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  profilePhoto: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  status: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  readReceipts: z.boolean().optional(),
  typingIndicators: z.boolean().optional(),
  onlineStatus: z.boolean().optional(),
});

export const updateNotificationSchema = z.object({
  messages: z.boolean().optional(),
  groupMessages: z.boolean().optional(),
  calls: z.boolean().optional(),
  mentions: z.boolean().optional(),
  sound: z.boolean().optional(),
  vibration: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

export const updateSecuritySchema = z.object({
  loginAlerts: z.boolean().optional(),
  passwordChangeAlerts: z.boolean().optional(),
  newDeviceAlerts: z.boolean().optional(),
  suspiciousActivityAlerts: z.boolean().optional(),
  biometricLogin: z.boolean().optional(),
  e2eEncryption: z.boolean().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['online', 'offline', 'away', 'busy']),
});

export const getUserByIdSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
});

export const deleteAccountSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  feedback: z.string().max(2000).optional(),
});

export const rotateKeysSchema = z.object({
  currentPassword: z.string().min(8, 'Current password must be at least 8 characters long'),
});

export const searchUsersSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.number().int().min(1).max(100).optional().default(20),
});
