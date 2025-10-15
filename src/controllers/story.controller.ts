import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { StoryService } from '../services';
import { successResponse } from '../utils';

export const createStory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const story = await StoryService.createStory(userId, {
      type: req.body.type,
      content: req.body.content,
      mediaUrl: req.body.mediaUrl,
      backgroundColor: req.body.backgroundColor,
      textColor: req.body.textColor,
      duration: req.body.duration,
    });

    return successResponse({
      res,
      message: 'Story created successfully',
      data: { story },
    });
  } catch (error) {
    logger.error('Create story error', { error: (error as Error).message });
    next(error);
  }
};

export const viewStory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const story = await StoryService.viewStory(req.body.storyId, userId);

    return successResponse({
      res,
      message: 'Story viewed successfully',
      data: { story },
    });
  } catch (error) {
    logger.error('View story error', { error: (error as Error).message });
    next(error);
  }
};

export const getStories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await StoryService.getStoriesForUser(userId);

    return successResponse({
      res,
      message: 'Stories retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Get stories error', { error: (error as Error).message });
    next(error);
  }
};

export const deleteStory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await StoryService.deleteStory(req.body.storyId, userId);

    return successResponse({
      res,
      message: 'Story deleted successfully',
    });
  } catch (error) {
    logger.error('Delete story error', { error: (error as Error).message });
    next(error);
  }
};
