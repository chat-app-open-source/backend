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
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date of birth',
    }),
  gender: z.enum(['male', 'female', 'other']).optional(),
  language: z.string().default('en'),
  country: z.string().optional(),
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
});
