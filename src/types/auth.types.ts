import type { Request } from 'express';
import type mongoose from 'mongoose';

export interface IUser {
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
  };
  notificationSettings: {
    messages: boolean;
    groupMessages: boolean;
    calls: boolean;
    mentions: boolean;
    sound: boolean;
    vibration: boolean;
  };
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
}

export interface IUserDocument extends IUser, mongoose.Document {
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

// OAuth Profile Interfaces
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
