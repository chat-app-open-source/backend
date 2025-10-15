/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import logger from '../config/logger';
import { Conversation, Message, User } from '../models';
import type { IConversationDocument, IMessageDocument } from '../types';
import { E2EEncryptionService } from './encryption.service';
import { PushNotificationService } from './pushNotification.service';

export class ChatService {
  // Create a direct conversation
  static async createDirectConversation(
    user1Id: string,
    user2Id: string,
  ): Promise<IConversationDocument> {
    try {
      // Check if conversation already exists
      const existingConversation = await Conversation.findOne({
        type: 'direct',
        participants: {
          $all: [
            { $elemMatch: { userId: new mongoose.Types.ObjectId(user1Id) } },
            { $elemMatch: { userId: new mongoose.Types.ObjectId(user2Id) } },
          ],
        },
      });

      if (existingConversation) {
        return existingConversation;
      }

      const conversation = new Conversation({
        type: 'direct',
        participants: [
          { userId: new mongoose.Types.ObjectId(user1Id), role: 'member' },
          { userId: new mongoose.Types.ObjectId(user2Id), role: 'member' },
        ],
        createdBy: new mongoose.Types.ObjectId(user1Id),
        admins: [new mongoose.Types.ObjectId(user1Id), new mongoose.Types.ObjectId(user2Id)],
        settings: {
          e2eEncryption: true, // Enable E2E by default for direct messages
        },
      });

      await conversation.save();

      // Populate participants
      await conversation.populate(
        'participants.userId',
        'username firstName lastName profilePicture status publicKey',
      );

      logger.info('Direct conversation created', {
        conversationId: conversation._id,
        user1Id,
        user2Id,
        e2eEnabled: true,
      });

      return conversation;
    } catch (error) {
      logger.error('Failed to create direct conversation', {
        user1Id,
        user2Id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Create a group conversation
  static async createGroupConversation(
    creatorId: string,
    name: string,
    participantIds: string[],
    description?: string,
    avatar?: string,
    settings?: any,
  ): Promise<IConversationDocument> {
    try {
      // Validate participant count
      if (participantIds.length > 100) {
        throw new Error('Group cannot have more than 100 participants');
      }

      const participants = [
        { userId: new mongoose.Types.ObjectId(creatorId), role: 'admin' },
        ...participantIds.map(id => ({
          userId: new mongoose.Types.ObjectId(id),
          role: 'member',
          addedBy: new mongoose.Types.ObjectId(creatorId),
        })),
      ];

      const conversation = new Conversation({
        type: 'group',
        name,
        description,
        avatar,
        participants,
        createdBy: new mongoose.Types.ObjectId(creatorId),
        admins: [new mongoose.Types.ObjectId(creatorId)],
        settings: {
          allowInvites: settings?.allowInvites ?? true,
          allowMedia: settings?.allowMedia ?? true,
          allowCalls: settings?.allowCalls ?? true,
          requireApproval: settings?.requireApproval ?? false,
          slowMode: settings?.slowMode ?? 0,
          isPublic: settings?.isPublic ?? false,
          e2eEncryption: settings?.e2eEncryption ?? true,
        },
      });

      await conversation.save();

      // Populate participants
      await conversation.populate(
        'participants.userId',
        'username firstName lastName profilePicture status publicKey',
      );

      logger.info('Group conversation created', {
        conversationId: conversation._id,
        creatorId,
        name,
        participantCount: participants.length,
      });

      return conversation;
    } catch (error) {
      logger.error('Failed to create group conversation', {
        creatorId,
        name,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Create a channel conversation
  static async createChannelConversation(
    creatorId: string,
    name: string,
    description?: string,
    avatar?: string,
    settings?: any,
  ): Promise<IConversationDocument> {
    try {
      const conversation = new Conversation({
        type: 'channel',
        name,
        description,
        avatar,
        participants: [{ userId: new mongoose.Types.ObjectId(creatorId), role: 'admin' }],
        createdBy: new mongoose.Types.ObjectId(creatorId),
        admins: [new mongoose.Types.ObjectId(creatorId)],
        settings: {
          allowInvites: settings?.allowInvites ?? true,
          allowMedia: settings?.allowMedia ?? true,
          allowCalls: settings?.allowCalls ?? true,
          requireApproval: settings?.requireApproval ?? false,
          slowMode: settings?.slowMode ?? 0,
          isPublic: settings?.isPublic ?? true, // Channels are public by default
          e2eEncryption: settings?.e2eEncryption ?? false, // Channels typically don't use E2E
        },
      });

      await conversation.save();

      // Populate participants
      await conversation.populate(
        'participants.userId',
        'username firstName lastName profilePicture status publicKey',
      );

      logger.info('Channel conversation created', {
        conversationId: conversation._id,
        creatorId,
        name,
      });

      return conversation;
    } catch (error) {
      logger.error('Failed to create channel conversation', {
        creatorId,
        name,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Send a message with E2E encryption
  static async sendMessage(
    conversationId: string,
    senderId: string,
    data: {
      type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location';
      content: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      thumbnailUrl?: string;
      duration?: number;
      location?: {
        latitude: number;
        longitude: number;
        address?: string;
      };
      replyTo?: string;
      mentions?: string[];
      enableE2E?: boolean;
      encryptedContent?: string;
      encryptionMetadata?: {
        algorithm: string;
        nonce: string;
        recipientPublicKeys: Record<string, string>;
      };
    },
  ): Promise<IMessageDocument> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (!conversation.isUserParticipant(senderId)) {
        throw new Error('User is not a participant in this conversation');
      }

      // Check slow mode
      if (conversation.settings.slowMode > 0) {
        const lastMessage = await Message.findOne({
          conversationId,
          senderId,
          createdAt: { $gt: new Date(Date.now() - conversation.settings.slowMode * 1000) },
        }).sort({ createdAt: -1 });

        if (lastMessage) {
          throw new Error(
            `Slow mode enabled. Please wait ${conversation.settings.slowMode} seconds between messages.`,
          );
        }
      }

      const messageData: any = {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: new mongoose.Types.ObjectId(senderId),
        type: data.type,
        content: data.content,
      };

      // Handle E2E encryption
      const shouldEncrypt = data.enableE2E !== false && conversation.settings.e2eEncryption;

      if (shouldEncrypt) {
        if (data.encryptedContent && data.encryptionMetadata) {
          // Client-side encryption
          messageData.encryptedContent = data.encryptedContent;
          messageData.encryptionMetadata = {
            algorithm: data.encryptionMetadata.algorithm,
            nonce: data.encryptionMetadata.nonce,
            recipientPublicKeys: new Map(
              Object.entries(data.encryptionMetadata.recipientPublicKeys),
            ),
          };
          messageData.content = '🔒 Encrypted message';
        } else {
          // Server-side encryption (fallback)
          await this.encryptMessageServerSide(messageData, conversation, senderId, data.content);
        }
      }

      // Handle file attachments
      if (data.fileUrl) {
        messageData.fileUrl = data.fileUrl;
        messageData.fileName = data.fileName;
        messageData.fileSize = data.fileSize;
        messageData.fileType = data.fileType;
      }

      if (data.thumbnailUrl) {
        messageData.thumbnailUrl = data.thumbnailUrl;
      }

      if (data.duration) {
        messageData.duration = data.duration;
      }

      if (data.location) {
        messageData.location = data.location;
      }

      if (data.replyTo) {
        messageData.replyTo = new mongoose.Types.ObjectId(data.replyTo);
      }

      if (data.mentions && data.mentions.length > 0) {
        messageData.mentions = data.mentions.map(id => new mongoose.Types.ObjectId(id));
      }

      const message = new Message(messageData);
      await message.save();

      // Update conversation's last message
      conversation.lastMessage = message._id;
      await conversation.save();

      // Populate message with sender info
      await message.populate('senderId', 'username firstName lastName profilePicture publicKey');
      if (message.replyTo) {
        await message.populate('replyTo');
      }
      if (message.mentions && message.mentions.length > 0) {
        await message.populate('mentions', 'username firstName lastName profilePicture');
      }

      // Send push notifications to participants
      await this.sendMessageNotifications(conversation, message, senderId);

      logger.info('Message sent', {
        messageId: message._id,
        conversationId,
        senderId,
        type: data.type,
        e2eEncrypted: shouldEncrypt,
      });

      return message;
    } catch (error) {
      logger.error('Failed to send message', {
        conversationId,
        senderId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Server-side message encryption (fallback)
  private static async encryptMessageServerSide(
    messageData: any,
    conversation: IConversationDocument,
    senderId: string,
    content: string,
  ): Promise<void> {
    try {
      // Get sender's private key
      const sender = await User.findById(senderId).select('privateKeyEncrypted keySalt');
      if (!sender || !sender.privateKeyEncrypted) {
        throw new Error('Sender encryption keys not found');
      }

      // Get participant public keys
      const participantIds = conversation.participants.map(p => p.userId.toString());
      const participantPublicKeys =
        await E2EEncryptionService.getParticipantPublicKeys(participantIds);

      // Encrypt message for all participants
      const encryptionResult = await E2EEncryptionService.encryptMessage(
        content,
        sender.privateKeyEncrypted,
        participantPublicKeys,
      );

      messageData.encryptedContent = encryptionResult.encryptedContent;
      messageData.encryptionMetadata = {
        algorithm: encryptionResult.encryptionMetadata.algorithm,
        nonce: encryptionResult.encryptionMetadata.nonce,
        recipientPublicKeys: new Map(
          Object.entries(encryptionResult.encryptionMetadata.recipientEncryptedMessages),
        ),
      };
      messageData.content = '🔒 Encrypted message';

      logger.debug('Message encrypted server-side', {
        conversationId: conversation._id,
        senderId,
        recipientCount: participantPublicKeys.size,
      });
    } catch (error) {
      logger.error('Server-side encryption failed', {
        conversationId: conversation._id,
        senderId,
        error: (error as Error).message,
      });
      throw new Error('Failed to encrypt message');
    }
  }

  // Send push notifications for new messages
  private static async sendMessageNotifications(
    conversation: IConversationDocument,
    message: IMessageDocument,
    senderId: string,
  ): Promise<void> {
    try {
      const sender = await User.findById(senderId).select('username firstName');
      if (!sender) return;

      const isEncrypted = !!message.encryptedContent;
      const messagePreview = isEncrypted
        ? '🔒 Encrypted message'
        : message.type === 'text'
          ? message.content
          : `Sent a ${message.type}`;

      const notificationPayload = {
        title: conversation.type === 'direct' ? sender.username : conversation.name || 'Group',
        body: messagePreview,
        data: {
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
          type: 'new_message',
          senderId,
          senderName: sender.username,
          isEncrypted: isEncrypted.toString(),
          messageType: message.type,
        },
        priority: 'high' as const,
        badge: 1,
      };

      // Send to all participants except sender
      for (const participant of conversation.participants) {
        if (participant.userId.toString() !== senderId) {
          await PushNotificationService.sendToUser(
            participant.userId.toString(),
            notificationPayload,
          );
        }
      }

      logger.debug('Message notifications sent', {
        conversationId: conversation._id,
        messageId: message._id,
        recipientCount: conversation.participants.length - 1,
        encrypted: isEncrypted,
      });
    } catch (error) {
      logger.error('Failed to send message notifications', {
        conversationId: conversation._id,
        error: (error as Error).message,
      });
      // Don't throw error, just log it
    }
  }

  // Ensure user has encryption keys
  private static async ensureUserEncryption(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId).select('publicKey privateKeyEncrypted');
      if (!user || !user.publicKey) {
        logger.warn('User missing encryption keys', { userId });
        // In production, you might want to initialize keys here
        // or prompt the user to set up E2E encryption
      }
    } catch (error) {
      logger.error('Failed to check user encryption status', {
        userId,
        error: (error as Error).message,
      });
    }
  }

  // Decrypt a message for a specific user
  static async decryptMessageForUser(
    messageId: string,
    userId: string,
    userPassword?: string, // For decrypting private key
  ): Promise<{ decryptedContent: string; success: boolean; error?: string }> {
    try {
      const message = await Message.findById(messageId);
      if (!message || !message.encryptedContent || !message.encryptionMetadata) {
        throw new Error('Message not found or not encrypted');
      }

      // Get user's private key
      const user = await User.findById(userId).select('privateKeyEncrypted keySalt');
      if (!user || !user.privateKeyEncrypted) {
        throw new Error('User encryption keys not found');
      }

      // Get sender's public key
      const sender = await User.findById(message.senderId).select('publicKey');
      if (!sender || !sender.publicKey) {
        throw new Error('Sender public key not found');
      }

      // Find the encrypted message for this user
      const userEncryptedMessage = message.encryptionMetadata.recipientPublicKeys.get(userId);
      if (!userEncryptedMessage) {
        throw new Error('No encrypted message found for this user');
      }

      let userPrivateKey: string;

      if (userPassword) {
        // Decrypt private key with password
        userPrivateKey = await E2EEncryptionService.decryptPrivateKey(
          user.privateKeyEncrypted,
          userPassword,
          user.keySalt,
        );
      } else {
        // Use encrypted private key directly (less secure)
        userPrivateKey = user.privateKeyEncrypted;
      }

      // Decrypt the message
      const decryptedContent = await E2EEncryptionService.decryptMessage(
        userEncryptedMessage,
        message.encryptionMetadata.nonce,
        sender.publicKey,
        userPrivateKey,
      );

      logger.info('Message decrypted successfully', {
        messageId,
        userId,
      });

      return {
        decryptedContent,
        success: true,
      };
    } catch (error) {
      logger.error('Failed to decrypt message', {
        messageId,
        userId,
        error: (error as Error).message,
      });
      return {
        decryptedContent: '',
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Get user's encryption status
  static async getEncryptionStatus(userId: string): Promise<{
    hasKeys: boolean;
    needsRotation: boolean;
    lastRotation?: Date;
  }> {
    try {
      const user = await User.findById(userId).select('publicKey encryptionSettings');
      if (!user) {
        throw new Error('User not found');
      }

      const needsRotation = await E2EEncryptionService.needsKeyRotation(userId);

      return {
        hasKeys: !!user.publicKey,
        needsRotation,
        lastRotation: user.encryptionSettings.lastKeyRotation,
      };
    } catch (error) {
      logger.error('Failed to get encryption status', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Initialize E2E encryption for a user
  static async initializeUserEncryption(userId: string, password: string): Promise<void> {
    try {
      await E2EEncryptionService.initializeUserEncryption(userId, password);
      logger.info('User E2E encryption initialized', { userId });
    } catch (error) {
      logger.error('Failed to initialize user E2E encryption', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Rotate user's encryption keys
  static async rotateUserEncryptionKeys(userId: string, password: string): Promise<void> {
    try {
      await E2EEncryptionService.rotateUserKeys(userId, password);
      logger.info('User E2E encryption keys rotated', { userId });
    } catch (error) {
      logger.error('Failed to rotate user E2E encryption keys', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
  // Mark message as read
  static async markMessageAsRead(messageId: string, readerId: string): Promise<IMessageDocument> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user is in the conversation
      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation || !conversation.isUserParticipant(readerId)) {
        throw new Error('User is not a participant in this conversation');
      }

      // Add to readBy if not already there
      if (!message.readBy.some(id => id.toString() === readerId)) {
        message.readBy.push(new mongoose.Types.ObjectId(readerId));
        await message.save();
      }

      logger.debug('Message marked as read', {
        messageId,
        readerId,
      });

      return message;
    } catch (error) {
      logger.error('Failed to mark message as read', {
        messageId,
        readerId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Add reaction to message
  static async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<IMessageDocument> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Remove existing reaction from this user
      message.reactions = message.reactions.filter(
        reaction => reaction.userId.toString() !== userId,
      );

      // Add new reaction
      message.reactions.push({
        userId: new mongoose.Types.ObjectId(userId),
        emoji,
        createdAt: new Date(),
      });

      await message.save();

      // Populate reactions
      await message.populate('reactions.userId', 'username firstName lastName profilePicture');

      logger.info('Reaction added to message', {
        messageId,
        userId,
        emoji,
      });

      return message;
    } catch (error) {
      logger.error('Failed to add reaction to message', {
        messageId,
        userId,
        emoji,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Delete message
  static async deleteMessage(
    messageId: string,
    userId: string,
    forEveryone: boolean = false,
  ): Promise<void> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.senderId.toString() !== userId && !forEveryone) {
        throw new Error('You can only delete your own messages');
      }

      if (forEveryone) {
        message.deleted = true;
        message.deletedForEveryone = true;
        message.deletedAt = new Date();
        message.content = 'This message was deleted';
        message.encryptedContent = undefined;
        message.encryptionMetadata = undefined;
        message.fileUrl = undefined;
        message.fileName = undefined;
        message.thumbnailUrl = undefined;
        message.location = undefined;
      } else {
        message.deleted = true;
        message.deletedAt = new Date();
      }

      await message.save();

      logger.info('Message deleted', {
        messageId,
        userId,
        forEveryone,
      });
    } catch (error) {
      logger.error('Failed to delete message', {
        messageId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Star message
  static async starMessage(messageId: string, userId: string): Promise<IMessageDocument> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (!message.starredBy.some(id => id.toString() === userId)) {
        message.starredBy.push(new mongoose.Types.ObjectId(userId));
        await message.save();
      }

      logger.info('Message starred', {
        messageId,
        userId,
      });

      return message;
    } catch (error) {
      logger.error('Failed to star message', {
        messageId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Unstar message
  static async unstarMessage(messageId: string, userId: string): Promise<IMessageDocument> {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      message.starredBy = message.starredBy.filter(id => id.toString() !== userId);

      await message.save();

      logger.info('Message unstarred', {
        messageId,
        userId,
      });

      return message;
    } catch (error) {
      logger.error('Failed to unstar message', {
        messageId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Forward messages
  static async forwardMessages(
    messageIds: string[],
    conversationIds: string[],
    senderId: string,
  ): Promise<{ [conversationId: string]: IMessageDocument[] }> {
    try {
      const messages = await Message.find({
        _id: { $in: messageIds.map(id => new mongoose.Types.ObjectId(id)) },
        deleted: false,
      });

      if (messages.length === 0) {
        throw new Error('No valid messages found to forward');
      }

      const result: { [conversationId: string]: IMessageDocument[] } = {};

      for (const conversationId of conversationIds) {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isUserParticipant(senderId)) {
          continue;
        }

        const forwardedMessages: IMessageDocument[] = [];

        for (const originalMessage of messages) {
          const forwardedMessage = new Message({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            senderId: new mongoose.Types.ObjectId(senderId),
            type: originalMessage.type,
            content: originalMessage.content,
            fileUrl: originalMessage.fileUrl,
            fileName: originalMessage.fileName,
            fileSize: originalMessage.fileSize,
            fileType: originalMessage.fileType,
            thumbnailUrl: originalMessage.thumbnailUrl,
            duration: originalMessage.duration,
            location: originalMessage.location,
            forwarded: true,
            forwardedFrom: originalMessage._id,
          });

          await forwardedMessage.save();
          await forwardedMessage.populate('senderId', 'username firstName lastName profilePicture');

          forwardedMessages.push(forwardedMessage);

          // Update conversation's last message
          conversation.lastMessage = forwardedMessage._id;
        }

        await conversation.save();
        result[conversationId] = forwardedMessages;
      }

      logger.info('Messages forwarded', {
        messageCount: messages.length,
        conversationCount: conversationIds.length,
        senderId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to forward messages', {
        messageIds,
        conversationIds,
        senderId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Get conversation messages with pagination
  static async getConversationMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: IMessageDocument[]; total: number; hasMore: boolean }> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.isUserParticipant(userId)) {
        throw new Error('Conversation not found or user not participant');
      }

      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        Message.find({ conversationId, deleted: false })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('senderId', 'username firstName lastName profilePicture')
          .populate('replyTo')
          .populate('mentions', 'username firstName lastName profilePicture')
          .populate('reactions.userId', 'username firstName lastName profilePicture'),
        Message.countDocuments({ conversationId, deleted: false }),
      ]);

      // Mark messages as read for this user
      const unreadMessages = messages.filter(
        message => !message.readBy.some(id => id.toString() === userId),
      );

      if (unreadMessages.length > 0) {
        await Message.updateMany(
          {
            _id: { $in: unreadMessages.map(m => m._id) },
            readBy: { $ne: new mongoose.Types.ObjectId(userId) },
          },
          {
            $push: { readBy: new mongoose.Types.ObjectId(userId) },
          },
        );
      }

      return {
        messages: messages.reverse(), // Return in chronological order
        total,
        hasMore: skip + messages.length < total,
      };
    } catch (error) {
      logger.error('Failed to get conversation messages', {
        conversationId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Get user conversations
  static async getUserConversations(userId: string): Promise<IConversationDocument[]> {
    try {
      const conversations = await Conversation.find({
        'participants.userId': new mongoose.Types.ObjectId(userId),
        isActive: true,
      })
        .populate(
          'participants.userId',
          'username firstName lastName profilePicture status lastSeen',
        )
        .populate('lastMessage')
        .populate('createdBy', 'username firstName lastName profilePicture')
        .sort({ updatedAt: -1 });

      return conversations;
    } catch (error) {
      logger.error('Failed to get user conversations', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Add user to group
  static async addUserToGroup(
    conversationId: string,
    userId: string,
    addedBy: string,
  ): Promise<IConversationDocument> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.type !== 'group') {
        throw new Error('Group conversation not found');
      }

      // Check if adder is admin
      const adderRole = conversation.getUserRole(addedBy);
      if (adderRole !== 'admin' && adderRole !== 'moderator') {
        throw new Error('Only admins and moderators can add users to group');
      }

      // Check if user is already in group
      if (conversation.isUserParticipant(userId)) {
        throw new Error('User is already in the group');
      }

      // Check group size limit
      if (conversation.participants.length >= 100) {
        throw new Error('Group has reached maximum capacity (100 users)');
      }

      conversation.participants.push({
        userId: new mongoose.Types.ObjectId(userId),
        role: 'member',
        addedBy: new mongoose.Types.ObjectId(addedBy),
        joinedAt: new Date(),
      });

      await conversation.save();
      await conversation.populate(
        'participants.userId',
        'username firstName lastName profilePicture status',
      );

      logger.info('User added to group', {
        conversationId,
        userId,
        addedBy,
      });

      return conversation;
    } catch (error) {
      logger.error('Failed to add user to group', {
        conversationId,
        userId,
        addedBy,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Remove user from group
  static async removeUserFromGroup(
    conversationId: string,
    userId: string,
    removedBy: string,
  ): Promise<IConversationDocument> {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.type !== 'group') {
        throw new Error('Group conversation not found');
      }

      // Check if remover is admin
      const removerRole = conversation.getUserRole(removedBy);
      if (removerRole !== 'admin' && removerRole !== 'moderator') {
        throw new Error('Only admins and moderators can remove users from group');
      }

      // Check if user to remove is admin (admins can only be removed by other admins)
      const userRole = conversation.getUserRole(userId);
      if (userRole === 'admin' && removerRole !== 'admin') {
        throw new Error('Only admins can remove other admins');
      }

      conversation.participants = conversation.participants.filter(
        p => p.userId.toString() !== userId,
      );

      // Remove from admins if user was admin
      conversation.admins = conversation.admins.filter(adminId => adminId.toString() !== userId);

      await conversation.save();
      await conversation.populate(
        'participants.userId',
        'username firstName lastName profilePicture status',
      );

      logger.info('User removed from group', {
        conversationId,
        userId,
        removedBy,
      });

      return conversation;
    } catch (error) {
      logger.error('Failed to remove user from group', {
        conversationId,
        userId,
        removedBy,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Get message by ID
  static async getMessageById(messageId: string): Promise<IMessageDocument | null> {
    try {
      const message = await Message.findById(messageId);
      return message;
    } catch (error) {
      logger.error('Failed to get message by ID', {
        messageId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  // Search messages
  static async searchMessages(
    userId: string,
    query: string,
    conversationId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ messages: IMessageDocument[]; total: number; hasMore: boolean }> {
    try {
      const skip = (page - 1) * limit;

      let searchFilter: any = {
        deleted: false,
        $text: { $search: query },
      };

      if (conversationId) {
        // Check if user is participant in the conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isUserParticipant(userId)) {
          throw new Error('Conversation not found or user not participant');
        }
        searchFilter.conversationId = new mongoose.Types.ObjectId(conversationId);
      } else {
        // Search across all user's conversations
        const userConversations = await Conversation.find({
          'participants.userId': new mongoose.Types.ObjectId(userId),
          isActive: true,
        }).select('_id');

        const conversationIds = userConversations.map(conv => conv._id);
        searchFilter.conversationId = { $in: conversationIds };
      }

      // Ensure text index exists for search
      await Message.createIndexes();

      const [messages, total] = await Promise.all([
        Message.find(searchFilter)
          .sort({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limit)
          .populate('senderId', 'username firstName lastName profilePicture')
          .populate('conversationId', 'name type avatar'),
        Message.countDocuments(searchFilter),
      ]);

      return {
        messages,
        total,
        hasMore: skip + messages.length < total,
      };
    } catch (error) {
      logger.error('Failed to search messages', {
        userId,
        query,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
