import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IApiAttempt extends Document {
  ip: string;
  apiKey: string;
  path: string;
  userAgent?: string;
  success: boolean;
  timestamp: Date;
}

const apiAttemptSchema = new Schema<IApiAttempt>(
  {
    ip: {
      type: String,
      required: true,
    },
    apiKey: {
      type: String,
      required: true,
    },
    path: {
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
      index: { expires: '1d' },
    },
  },
  {
    timestamps: false,
  },
);

apiAttemptSchema.index({ ip: 1, timestamp: -1 });
apiAttemptSchema.index({ apiKey: 1, timestamp: -1 });

export const ApiAttempt = mongoose.model<IApiAttempt>('ApiAttempt', apiAttemptSchema);
