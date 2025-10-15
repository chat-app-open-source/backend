import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { FileService } from '../services';
import { errorResponse, successResponse } from '../utils';

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return errorResponse({
        res,
        message: 'No file uploaded',
        statusCode: 400,
      });
    }

    const userId = req.user!.id;
    const fileService = new FileService();
    const result = await fileService.uploadFile(
      req.file,
      userId,
      req.body.conversationId,
      req.body.folder || 'chat',
    );

    return successResponse({
      res,
      message: 'File uploaded successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Upload file error', { error: (error as Error).message });
    next(error);
  }
};

export const deleteFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const fileService = new FileService();
    await fileService.deleteFile(req.body.fileId, userId);

    return successResponse({
      res,
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error('Delete file error', { error: (error as Error).message });
    next(error);
  }
};

export const getUserFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const fileService = new FileService();
    const result = await fileService.getUserFiles(userId, page, limit);

    return successResponse({
      res,
      message: 'User files retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Get user files error', { error: (error as Error).message });
    next(error);
  }
};

export const getConversationFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const fileService = new FileService();
    const result = await fileService.getConversationFiles(conversationId, userId, page, limit);

    return successResponse({
      res,
      message: 'Conversation files retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Get conversation files error', { error: (error as Error).message });
    next(error);
  }
};

export const getFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const fileService = new FileService();
    const file = await fileService.getFileById(req.params.fileId, userId);

    return successResponse({
      res,
      message: 'File retrieved successfully',
      data: { file },
    });
  } catch (error) {
    logger.error('Get file error', { error: (error as Error).message });
    next(error);
  }
};
