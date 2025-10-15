/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema } from 'mongoose';
import { E2EEncryptionService } from '../services';
import type { IConversationDocument } from '../types';

const conversationSchema = new Schema<IConversationDocument>(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'channel'],
      required: true,
    },
    name: {
      type: String,
      required(this: IConversationDocument) {
        return this.type === 'group' || this.type === 'channel';
      },
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    avatar: {
      type: String,
    },
    participants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'moderator', 'member', 'subscriber'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    pinnedMessages: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    settings: {
      allowInvites: {
        type: Boolean,
        default: true,
      },
      allowMedia: {
        type: Boolean,
        default: true,
      },
      allowCalls: {
        type: Boolean,
        default: true,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
      slowMode: {
        type: Number,
        default: 0,
        min: 0,
        max: 300,
      },
      isPublic: {
        type: Boolean,
        default: false,
      },
      e2eEncryption: {
        type: Boolean,
        default: true,
      },
    },
    encryptionKey: {
      type: String, // Group encryption key (encrypted for each participant)
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
conversationSchema.index({ type: 1 });
conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ createdAt: -1 });
conversationSchema.index({ lastMessage: -1 });
conversationSchema.index({ 'settings.e2eEncryption': 1 });

// Virtual for participant count
conversationSchema.virtual('participantCount').get(function (this: IConversationDocument) {
  return this.participants.length;
});

// Methods
conversationSchema.methods.isUserParticipant = function (userId: string): boolean {
  return this.participants.some((p: any) => p.userId.toString() === userId.toString());
};

conversationSchema.methods.getUserRole = function (userId: string): string | null {
  const participant = this.participants.find((p: any) => p.userId.toString() === userId.toString());
  return participant ? participant.role : null;
};

// Get public keys of all participants for E2E encryption
conversationSchema.methods.getParticipantPublicKeys = async function (): Promise<
  Map<string, string>
> {
  const participantIds = this.participants.map((p: any) => p.userId.toString());
  return E2EEncryptionService.getParticipantPublicKeys(participantIds);
};

// Pre-save middleware to initialize E2E encryption for new conversations
conversationSchema.pre('save', async function (next) {
  if (this.isNew && this.settings.e2eEncryption) {
    try {
      // Generate group encryption key (this would be encrypted for each participant)
      // In a real implementation, you'd encrypt this key with each participant's public key
      const { publicKey } = await E2EEncryptionService.generateKeyPair();
      this.encryptionKey = publicKey;
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

export const Conversation = mongoose.model<IConversationDocument>(
  'Conversation',
  conversationSchema,
);
