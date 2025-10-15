import mongoose, { Schema } from 'mongoose';
import type { IMeetingDocument } from '../types';

const meetingSchema = new Schema<IMeetingDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coHosts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    participants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['host', 'co-host', 'participant'],
          default: 'participant',
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
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    scheduledStart: {
      type: Date,
    },
    scheduledEnd: {
      type: Date,
    },
    maxParticipants: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000,
    },
    settings: {
      allowScreenShare: {
        type: Boolean,
        default: true,
      },
      allowRecording: {
        type: Boolean,
        default: true,
      },
      muteOnEntry: {
        type: Boolean,
        default: false,
      },
      waitingRoom: {
        type: Boolean,
        default: false,
      },
      chatEnabled: {
        type: Boolean,
        default: true,
      },
      participantApproval: {
        type: Boolean,
        default: false,
      },
      allowParticipantUnmute: {
        type: Boolean,
        default: true,
      },
      autoRecord: {
        type: Boolean,
        default: false,
      },
    },
    recordings: [
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
        fileSize: {
          type: Number,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
meetingSchema.index({ host: 1 });
meetingSchema.index({ roomId: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ scheduledStart: 1 });
meetingSchema.index({ createdAt: -1 });

// Generate room ID before save
meetingSchema.pre('save', function (next) {
  if (!this.roomId) {
    this.roomId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

export const Meeting = mongoose.model<IMeetingDocument>('Meeting', meetingSchema);
