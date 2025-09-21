import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  otp: string;
  email: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    otp: {
      type: String,
      required: [true, 'OTP is required'],
      minlength: [6, 'OTP must be 6 digits'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['email_verification', 'password_reset'],
        message: '{VALUE} is not a valid OTP type',
      },
      required: [true, 'OTP type is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],

      expires: '0ms',
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

otpSchema.index({ email: 1, type: 1 });

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
