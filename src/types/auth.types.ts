import type { Request } from 'express';
import type mongoose from 'mongoose';
import type { Credential } from './webauthn.types';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  profilePicture?: string;
  coverPhoto?: string;
  bio?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: Date;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  oauthProvider?: 'google' | 'facebook' | null;
  oauthId?: string;
  gender?: 'male' | 'female' | 'other';
  language: string;
  country?: string;
  privacySettings: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    status: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    typingIndicators: boolean;
    onlineStatus: boolean;
  };
  notificationSettings: {
    messages: boolean;
    groupMessages: boolean;
    calls: boolean;
    mentions: boolean;
    sound: boolean;
    vibration: boolean;
    pushNotifications: boolean;
  };
  securitySettings: {
    loginAlerts: boolean;
    passwordChangeAlerts: boolean;
    newDeviceAlerts: boolean;
    suspiciousActivityAlerts: boolean;
    biometricLogin: boolean;
  };
  deviceTokens: Array<{
    token: string;
    platform: 'web' | 'android' | 'ios';
    createdAt: Date;
  }>;
  subscribedTopics: string[];
  contacts: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  groups: mongoose.Types.ObjectId[];
  callHistory: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  isLocked: boolean;
  lockUntil?: Date;
  lockReason?: 'excessive_failed_attempts' | 'excessive_successful_logins';
  lockCount: number;
  // 2FA Fields
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  // WebAuthn Credentials for Biometric
  credentials: Credential[];
  // Session Management
  activeSessions?: Array<{
    sessionId: string;
    deviceType: 'web' | 'mobile' | 'desktop';
    userAgent: string;
    ipAddress: string;
    lastActivity: Date;
    createdAt: Date;
  }>;
}

export interface IUserDocument extends IUser, mongoose.Document {
  _id: mongoose.Types.ObjectId;
  id: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IOAuthUser {
  oauthId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

export interface ITokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface GoogleProfile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{
    value: string;
    verified: boolean;
  }>;
  photos: Array<{
    value: string;
  }>;
  provider: string;
}

export interface FacebookProfile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{
    value: string;
  }> | null;
  photos: Array<{
    value: string;
  }> | null;
  provider: string;
}

export type PlatformType = 'web' | 'mobile' | 'desktop' | 'unknown';

export interface PlatformRequest extends Request {
  platform?: PlatformType;
  oauthState?: {
    platform: PlatformType;
    timestamp: number;
    returnUrl?: string;
  };
}

// 2FA Types
export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  success: boolean;
  backupCodes: string[];
}

// Rate Limiting Types
export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Session Types
export interface UserSession {
  sessionId: string;
  userId: string;
  deviceType: 'web' | 'mobile' | 'desktop';
  userAgent: string;
  ipAddress: string;
  lastActivity: Date;
  createdAt: Date;
  isActive: boolean;
  location?: {
    country?: string;
    city?: string;
  };
}
