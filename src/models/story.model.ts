import mongoose, { Schema } from 'mongoose';
import type { IStoryDocument } from '../types';

const storySchema = new Schema<IStoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['image', 'video', 'text'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Story content cannot exceed 1000 characters'],
    },
    mediaUrl: {
      type: String,
      required(this: IStoryDocument) {
        return this.type === 'image' || this.type === 'video';
      },
    },
    thumbnailUrl: {
      type: String,
    },
    duration: {
      type: Number,
      default: 10, // seconds
    },
    backgroundColor: {
      type: String,
      default: '#000000',
    },
    textColor: {
      type: String,
      default: '#ffffff',
    },
    views: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });
storySchema.index({ createdAt: -1 });

export const Story = mongoose.model<IStoryDocument>('Story', storySchema);
