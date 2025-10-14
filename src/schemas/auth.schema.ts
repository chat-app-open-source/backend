import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .trim(),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .trim(),
  phoneNumber: z.string().optional(),
  dateOfBirth: z
    .string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date of birth',
    }),
  gender: z.enum(['male', 'female', 'other']).optional(),
  language: z.string().default('en'),
  country: z.string().optional(),
  deviceToken: z.string().optional(),
  platform: z.enum(['web', 'android', 'ios']).optional(),
});

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  deviceToken: z.string().optional(),
  platform: z.enum(['web', 'android', 'ios']).optional(),
  twoFactorToken: z.string().optional(),
});

export const verify2FALoginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  token: z
    .string()
    .min(6, '2FA token must be at least 6 characters')
    .max(8, '2FA token must not exceed 8 characters')
    .regex(/^\d+$/, '2FA token must contain only digits'),
  deviceToken: z.string().optional(),
  platform: z.enum(['web', 'android', 'ios']).optional(),
});

export const resendOTPSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  otpType: z.enum(['email_verification', 'password_reset']).default('email_verification'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
});

export const verifyPasswordResetOTPSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8, 'Old password must be at least 8 characters long'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const logoutSchema = z.object({
  refreshToken: z
    .string()
    .optional()
    .describe('Specific refresh token to revoke (for current device logout)'),
  clearDeviceTokens: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to clear all device tokens during logout'),
  sessionId: z.string().optional().describe('Session ID to terminate during logout'),
});

export const subscribeTopicSchema = z.object({
  deviceToken: z.string().min(1, 'Device token is required'),
  topic: z.string().min(1, 'Topic is required'),
});

export const unsubscribeTopicSchema = z.object({
  deviceToken: z.string().min(1, 'Device token is required'),
  topic: z.string().min(1, 'Topic is required'),
});

export const verify2FASchema = z.object({
  token: z
    .string()
    .length(6, 'Token must be 6 digits')
    .regex(/^\d+$/, 'Token must contain only digits'),
});

export const terminateOtherSessionsSchema = z.object({
  currentSessionId: z.string().min(1, 'Current session ID is required'),
});

export const biometricRegistrationSchema = z.object({
  deviceName: z.string().min(1, 'Device name is required').max(50, 'Device name too long'),
  deviceType: z.enum(['ios', 'android', 'web']),
});

export const biometricVerificationSchema = z.object({
  id: z.string().min(1, 'Credential ID is required'),
  rawId: z.string().min(1, 'Raw credential ID is required'),
  response: z.object({
    authenticatorData: z.string().min(1, 'Authenticator data is required'),
    clientDataJSON: z.string().min(1, 'Client data is required'),
    signature: z.string().min(1, 'Signature is required'),
    userHandle: z.string().optional(),
  }),
  type: z.literal('public-key'),
  clientExtensionResults: z.object({}).optional(),
  authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
});

export const biometricLoginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  response: z.object({
    id: z.string().min(1, 'Credential ID is required'),
    rawId: z.string().min(1, 'Raw credential ID is required'),
    response: z.object({
      authenticatorData: z.string().min(1, 'Authenticator data is required'),
      clientDataJSON: z.string().min(1, 'Client data is required'),
      signature: z.string().min(1, 'Signature is required'),
      userHandle: z.string().optional(),
    }),
    type: z.literal('public-key'),
    clientExtensionResults: z.object({}).optional(),
    authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
  }),
  deviceToken: z.string().optional(),
  platform: z.enum(['web', 'android', 'ios']).optional(),
});

export const removeCredentialSchema = z.object({
  credentialID: z.string().min(1, 'Credential ID is required'),
});

export const authenticationOptionsSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
});
