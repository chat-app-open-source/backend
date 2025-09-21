import mongoose from 'mongoose';

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
