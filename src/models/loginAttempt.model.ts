import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface ILoginAttempt extends Document {
  userId?: mongoose.Types.ObjectId;
  email: string;
  ip: string;
  userAgent?: string;
  success: boolean;
  timestamp: Date;
}

const loginAttemptSchema = new Schema<ILoginAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    success: {
      type: Boolean,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: { expires: '30d' },
    },
  },
  {
    timestamps: false,
  },
);

loginAttemptSchema.index({ userId: 1, timestamp: -1 });
loginAttemptSchema.index({ email: 1, timestamp: -1 });

export const LoginAttempt = mongoose.model<ILoginAttempt>('LoginAttempt', loginAttemptSchema);
