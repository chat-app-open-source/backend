import mongoose from 'mongoose';
import logger from '../config/logger';
import { Story, User } from '../models';
import type { IStoryDocument, IUserDocument } from '../types';

export class StoryService {
  // Create a story
  static async createStory(
    userId: string,
    data: {
      type: 'image' | 'video' | 'text';
      content: string;
      mediaUrl?: string;
      backgroundColor?: string;
      textColor?: string;
      duration?: number;
    },
  ): Promise<IStoryDocument> {
    try {
      // Set expiration to 24 hours from now
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const story = new Story({
        userId: new mongoose.Types.ObjectId(userId),
        type: data.type,
        content: data.content,
        mediaUrl: data.mediaUrl,
        backgroundColor: data.backgroundColor || '#000000',
        textColor: data.textColor || '#ffffff',
        duration: data.duration || 10,
        expiresAt,
      });

      await story.save();

      // Populate user info
      await story.populate('userId', 'username firstName lastName profilePicture');

      logger.info('Story created', {
        storyId: story._id,
        userId,
        type: data.type,
      });

      return story;
    } catch (error) {
      logger.error('Failed to create story', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // View a story
  static async viewStory(storyId: string, viewerId: string): Promise<IStoryDocument> {
    try {
      const story = await Story.findById(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      // Check if story has expired
      if (story.expiresAt < new Date()) {
        throw new Error('Story has expired');
      }

      // Add viewer if not already viewed
      if (!story.views.some(id => id.toString() === viewerId)) {
        story.views.push(new mongoose.Types.ObjectId(viewerId));
        await story.save();
      }

      logger.info('Story viewed', {
        storyId,
        viewerId,
      });

      return story;
    } catch (error) {
      logger.error('Failed to view story', {
        storyId,
        viewerId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Get stories for user's contacts
  static async getStoriesForUser(userId: string): Promise<{
    userStories: IStoryDocument[];
    contactStories: Array<{
      user: IUserDocument;
      stories: IStoryDocument[];
    }>;
  }> {
    try {
      // Get user's contacts (you would need to implement this based on your user model)
      const user = await User.findById(userId).populate('contacts');
      if (!user) {
        throw new Error('User not found');
      }

      const contactIds = user.contacts.map(contact => contact._id);
      const allUserIds = [new mongoose.Types.ObjectId(userId), ...contactIds];

      // Get active stories for these users
      const stories = await Story.find({
        userId: { $in: allUserIds },
        expiresAt: { $gt: new Date() },
      })
        .populate('userId', 'username firstName lastName profilePicture')
        .sort({ createdAt: -1 });

      // Group stories by user
      const storiesByUser = new Map<string, IStoryDocument[]>();

      stories.forEach(story => {
        const userId = story.userId._id.toString();
        if (!storiesByUser.has(userId)) {
          storiesByUser.set(userId, []);
        }
        storiesByUser.get(userId)!.push(story);
      });

      // Separate user's stories and contact stories
      const userStories = storiesByUser.get(userId.toString()) || [];
      const contactStories: Array<{ user: IUserDocument; stories: IStoryDocument[] }> = [];

      for (const [contactUserId, contactUserStories] of storiesByUser) {
        if (contactUserId !== userId.toString()) {
          const contactUser = await User.findById(contactUserId).select(
            'username firstName lastName profilePicture',
          );
          if (contactUser) {
            contactStories.push({
              user: contactUser,
              stories: contactUserStories,
            });
          }
        }
      }

      return {
        userStories,
        contactStories,
      };
    } catch (error) {
      logger.error('Failed to get stories for user', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Delete a story
  static async deleteStory(storyId: string, userId: string): Promise<void> {
    try {
      const story = await Story.findById(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      if (story.userId.toString() !== userId) {
        throw new Error('You can only delete your own stories');
      }

      await Story.findByIdAndDelete(storyId);

      logger.info('Story deleted', {
        storyId,
        userId,
      });
    } catch (error) {
      logger.error('Failed to delete story', {
        storyId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Clean up expired stories
  static async cleanupExpiredStories(): Promise<number> {
    try {
      const result = await Story.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      logger.info('Expired stories cleaned up', {
        deletedCount: result.deletedCount,
      });

      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup expired stories', {
        error: (error as Error).message,
      });
      return 0;
    }
  }
}
