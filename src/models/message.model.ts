import mongoose, { Schema } from 'mongoose';
import type { IMessageDocument } from '../types';

const messageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'system'],
      required: true,
    },
    content: {
      type: String,
      required(this: IMessageDocument) {
        return this.type === 'text' || this.type === 'system';
      },
      trim: true,
      maxlength: [5000, 'Message content cannot exceed 5000 characters'],
    },
    // E2E Encrypted fields
    encryptedContent: {
      type: String,
    },
    encryptionMetadata: {
      algorithm: {
        type: String,
        default: 'x25519-xsalsa20-poly1305',
      },
      nonce: {
        type: String, // Base64 encoded nonce
      },
      recipientPublicKeys: {
        type: Map,
        of: String, // Encrypted content per recipient (userId -> encryptedMessage)
      },
    },
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    fileType: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
    },
    duration: {
      type: Number,
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    reactions: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        emoji: {
          type: String,
          required: true,
          maxlength: 10,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    starredBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    forwarded: {
      type: Boolean,
      default: false,
    },
    forwardedFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ 'reactions.userId': 1 });
messageSchema.index({ starredBy: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'encryptionMetadata.recipientPublicKeys': 1 });

// Methods
messageSchema.methods.isReadBy = function (userId: string): boolean {
  return this.readBy.some(
    (readerId: mongoose.Types.ObjectId) => readerId.toString() === userId.toString(),
  );
};

// Virtual for getting reaction count by emoji
messageSchema.virtual('reactionCounts').get(function (this: IMessageDocument) {
  const counts: { [emoji: string]: number } = {};
  this.reactions.forEach(reaction => {
    counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
  });
  return counts;
});

export const Message = mongoose.model<IMessageDocument>('Message', messageSchema);
