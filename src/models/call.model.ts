import mongoose, { Schema } from 'mongoose';
import type { ICallDocument } from '../types';

const callSchema = new Schema<ICallDocument>(
  {
    type: {
      type: String,
      enum: ['audio', 'video'],
      required: true,
    },
    participants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        leftAt: {
          type: Date,
        },
        duration: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ['calling', 'joined', 'rejected', 'missed', 'busy'],
          default: 'calling',
        },
        audioEnabled: {
          type: Boolean,
          default: true,
        },
        videoEnabled: {
          type: Boolean,
          default: true,
        },
        screenShared: {
          type: Boolean,
          default: false,
        },
      },
    ],
    initiator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['calling', 'active', 'ended', 'rejected', 'missed'],
      default: 'calling',
    },
    callRecordings: [
      {
        url: {
          type: String,
          required: true,
        },
        duration: {
          type: Number,
          required: true,
        },
        startedAt: {
          type: Date,
          required: true,
        },
        endedAt: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes
callSchema.index({ conversationId: 1, createdAt: -1 });
callSchema.index({ meetingId: 1, createdAt: -1 });
callSchema.index({ initiator: 1 });
callSchema.index({ status: 1 });
callSchema.index({ createdAt: -1 });

// Calculate duration before save
callSchema.pre('save', function (next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }
  next();
});

export const Call = mongoose.model<ICallDocument>('Call', callSchema);
