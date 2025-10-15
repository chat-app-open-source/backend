import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { ChatService } from '../services';
import { successResponse } from '../utils';

export const createConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const conversation = await ChatService.createDirectConversation(
      userId,
      req.body.participantIds?.[0] || req.body.userId,
    );

    return successResponse({
      res,
      message: 'Conversation created successfully',
      data: { conversation },
    });
  } catch (error) {
    logger.error('Create conversation error', { error: (error as Error).message });
    next(error);
  }
};

export const createGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Fixed: Properly call the group creation service
    const conversation = await ChatService.createGroupConversation(
      userId,
      req.body.name,
      req.body.participantIds || [],
      req.body.description,
      req.body.avatar,
      req.body.settings,
    );

    return successResponse({
      res,
      message: 'Group created successfully',
      data: { conversation },
    });
  } catch (error) {
    logger.error('Create group error', { error: (error as Error).message });
    next(error);
  }
};

export const createChannel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Fixed: Properly call the channel creation service
    const conversation = await ChatService.createChannelConversation(
      userId,
      req.body.name,
      req.body.description,
      req.body.avatar,
      req.body.settings,
    );

    return successResponse({
      res,
      message: 'Channel created successfully',
      data: { conversation },
    });
  } catch (error) {
    logger.error('Create channel error', { error: (error as Error).message });
    next(error);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const message = await ChatService.sendMessage(req.body.conversationId, userId, {
      type: req.body.type,
      content: req.body.content,
      fileUrl: req.body.file?.url,
      fileName: req.body.file?.name,
      fileSize: req.body.file?.size,
      fileType: req.body.file?.type,
      thumbnailUrl: req.body.file?.thumbnailUrl,
      location: req.body.location,
      replyTo: req.body.replyTo,
      mentions: req.body.mentions,
      enableE2E: req.body.enableE2E,
      encryptedContent: req.body.encryptedContent,
      encryptionMetadata: req.body.encryptionMetadata,
    });

    return successResponse({
      res,
      message: 'Message sent successfully',
      data: { message },
    });
  } catch (error) {
    logger.error('Send message error', { error: (error as Error).message });
    next(error);
  }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const conversations = await ChatService.getUserConversations(userId);

    return successResponse({
      res,
      message: 'Conversations retrieved successfully',
      data: { conversations },
    });
  } catch (error) {
    logger.error('Get conversations error', { error: (error as Error).message });
    next(error);
  }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await ChatService.getConversationMessages(conversationId, userId, page, limit);

    return successResponse({
      res,
      message: 'Messages retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Get messages error', { error: (error as Error).message });
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const message = await ChatService.markMessageAsRead(req.body.messageId, userId);

    return successResponse({
      res,
      message: 'Message marked as read',
      data: { message },
    });
  } catch (error) {
    logger.error('Mark as read error', { error: (error as Error).message });
    next(error);
  }
};

export const addReaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const message = await ChatService.addReaction(req.body.messageId, userId, req.body.emoji);

    return successResponse({
      res,
      message: 'Reaction added successfully',
      data: { message },
    });
  } catch (error) {
    logger.error('Add reaction error', { error: (error as Error).message });
    next(error);
  }
};

export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await ChatService.deleteMessage(req.body.messageId, userId, req.body.forEveryone);

    return successResponse({
      res,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    logger.error('Delete message error', { error: (error as Error).message });
    next(error);
  }
};

export const starMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const message = await ChatService.starMessage(req.body.messageId, userId);

    return successResponse({
      res,
      message: 'Message starred successfully',
      data: { message },
    });
  } catch (error) {
    logger.error('Star message error', { error: (error as Error).message });
    next(error);
  }
};

export const unstarMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const message = await ChatService.unstarMessage(req.body.messageId, userId);

    return successResponse({
      res,
      message: 'Message unstarred successfully',
      data: { message },
    });
  } catch (error) {
    logger.error('Unstar message error', { error: (error as Error).message });
    next(error);
  }
};

export const forwardMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await ChatService.forwardMessages(
      req.body.messageIds,
      req.body.conversationIds,
      userId,
    );

    return successResponse({
      res,
      message: 'Messages forwarded successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Forward messages error', { error: (error as Error).message });
    next(error);
  }
};

export const addParticipant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const conversation = await ChatService.addUserToGroup(
      req.body.conversationId,
      req.body.userId,
      userId,
    );

    return successResponse({
      res,
      message: 'Participant added successfully',
      data: { conversation },
    });
  } catch (error) {
    logger.error('Add participant error', { error: (error as Error).message });
    next(error);
  }
};

export const removeParticipant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const conversation = await ChatService.removeUserFromGroup(
      req.body.conversationId,
      req.body.userId,
      userId,
    );

    return successResponse({
      res,
      message: 'Participant removed successfully',
      data: { conversation },
    });
  } catch (error) {
    logger.error('Remove participant error', { error: (error as Error).message });
    next(error);
  }
};

export const searchMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await ChatService.searchMessages(
      userId,
      req.body.query,
      req.body.conversationId,
      page,
      limit,
    );

    return successResponse({
      res,
      message: 'Messages search completed',
      data: result,
    });
  } catch (error) {
    logger.error('Search messages error', { error: (error as Error).message });
    next(error);
  }
};

// New E2E Encryption endpoints
export const decryptMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await ChatService.decryptMessageForUser(req.body.messageId, userId);

    return successResponse({
      res,
      message: result.success ? 'Message decrypted successfully' : 'Failed to decrypt message',
      data: result,
    });
  } catch (error) {
    logger.error('Decrypt message error', { error: (error as Error).message });
    next(error);
  }
};

export const initializeEncryption = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    await ChatService.initializeUserEncryption(userId, password);

    return successResponse({
      res,
      message: 'E2E encryption initialized successfully',
    });
  } catch (error) {
    logger.error('Initialize encryption error', { error: (error as Error).message });
    next(error);
  }
};

export const rotateEncryptionKeys = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    await ChatService.rotateUserEncryptionKeys(userId, password);

    return successResponse({
      res,
      message: 'Encryption keys rotated successfully',
    });
  } catch (error) {
    logger.error('Rotate encryption keys error', { error: (error as Error).message });
    next(error);
  }
};
