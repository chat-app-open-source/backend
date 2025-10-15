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

  /** Privacy Settings */
  privacySettings: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    status: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    typingIndicators: boolean;
    onlineStatus: boolean;
  };

  /** Notification Settings */
  notificationSettings: {
    messages: boolean;
    groupMessages: boolean;
    calls: boolean;
    mentions: boolean;
    sound: boolean;
    vibration: boolean;
    pushNotifications: boolean;
  };

  /** Security Settings */
  securitySettings: {
    loginAlerts: boolean;
    passwordChangeAlerts: boolean;
    newDeviceAlerts: boolean;
    suspiciousActivityAlerts: boolean;
    biometricLogin: boolean;
    e2eEncryption: boolean;
  };

  /** Device tokens for push notifications */
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

  /** Account lock information */
  isLocked: boolean;
  lockUntil?: Date;
  lockReason?: 'excessive_failed_attempts' | 'excessive_successful_logins';
  lockCount: number;

  /** Two-Factor Authentication */
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];

  /** WebAuthn / Biometric credentials */
  credentials: Credential[];

  /** Session Management */
  activeSessions?: Array<{
    sessionId: string;
    deviceType: 'web' | 'mobile' | 'desktop';
    userAgent: string;
    ipAddress: string;
    lastActivity: Date;
    createdAt: Date;
  }>;

  /** End-to-End Encryption Keys (X25519) */
  publicKey: string; // base64
  privateKeyEncrypted: string; // encrypted private key
  keySalt: string; // salt for key derivation

  /** Encryption settings metadata */
  encryptionSettings: {
    algorithm: string;
    keyRotationInterval: number;
    lastKeyRotation: Date;
  };
}

export interface IUserDocument extends IUser, mongoose.Document {
  _id: mongoose.Types.ObjectId;
  id: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  needsKeyRotation(): boolean;
}

/** JWT Auth Tokens */
export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** OAuth login info */
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

/** Google OAuth profile */
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

/** Facebook OAuth profile */
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

/** Platform detection */
export type PlatformType = 'web' | 'mobile' | 'desktop' | 'unknown';

export interface PlatformRequest extends Request {
  platform?: PlatformType;
  oauthState?: {
    platform: PlatformType;
    timestamp: number;
    returnUrl?: string;
  };
}

/** Two-Factor Authentication setup */
export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  success: boolean;
  backupCodes: string[];
}

/** Rate Limiting Config */
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

/** Session Info */
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
