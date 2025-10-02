import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

import type { IUser } from '../types/auth.types';
import { comparePassword, hashPassword } from '../utils/password.util';

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked: boolean;
  lockUntil?: Date;
  lockReason?: 'excessive_failed_attempts' | 'excessive_successful_logins';
  lockCount: number;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required(this: IUserDocument) {
        return !this.oauthProvider;
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must not exceed 20 characters'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name must not exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name must not exceed 50 characters'],
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: Date,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    coverPhoto: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio must not exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['online', 'offline', 'away', 'busy'],
        message: '{VALUE} is not a valid status',
      },
      default: 'offline',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    oauthProvider: {
      type: String,
      enum: {
        values: ['google', 'facebook'],
        message: '{VALUE} is not a supported OAuth provider',
      },
      default: null,
    },
    oauthId: {
      type: String,
      sparse: true,
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other'],
        message: '{VALUE} is not a valid gender',
      },
    },
    language: {
      type: String,
      default: 'en',
    },
    country: {
      type: String,
      default: '',
    },
    privacySettings: {
      lastSeen: {
        type: String,
        enum: {
          values: ['everyone', 'contacts', 'nobody'],
          message: '{VALUE} is not a valid privacy setting',
        },
        default: 'everyone',
      },
      profilePhoto: {
        type: String,
        enum: {
          values: ['everyone', 'contacts', 'nobody'],
          message: '{VALUE} is not a valid privacy setting',
        },
        default: 'everyone',
      },
      status: {
        type: String,
        enum: {
          values: ['everyone', 'contacts', 'nobody'],
          message: '{VALUE} is not a valid privacy setting',
        },
        default: 'everyone',
      },
    },
    notificationSettings: {
      messages: { type: Boolean, default: true },
      groupMessages: { type: Boolean, default: true },
      calls: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      vibration: { type: Boolean, default: true },
    },
    contacts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    groups: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
    callHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Call',
      },
    ],
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockUntil: {
      type: Date,
    },
    lockReason: {
      type: String,
      enum: ['excessive_failed_attempts', 'excessive_successful_logins'],
    },
    lockCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ oauthProvider: 1, oauthId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ lastSeen: 1 });
userSchema.index({ isLocked: 1, lockUntil: 1 });

userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    try {
      this.password = await hashPassword(this.password);
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return comparePassword(candidatePassword, this.password);
};

export const User = mongoose.model<IUserDocument>('User', userSchema);
