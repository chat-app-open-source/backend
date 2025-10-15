import mongoose, { Schema } from 'mongoose';
import type { IFileDocument } from '../types';

const fileSchema = new Schema<IFileDocument>(
  {
    originalName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    storage: {
      type: String,
      enum: ['firebase', 's3'],
      required: true,
    },
    isCompressed: {
      type: Boolean,
      default: false,
    },
    compressionRatio: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ conversationId: 1 });
fileSchema.index({ fileType: 1 });
fileSchema.index({ createdAt: -1 });

export const File = mongoose.model<IFileDocument>('File', fileSchema);
