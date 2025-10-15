import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { MeetingService } from '../services';
import { errorResponse, successResponse } from '../utils';

export const createMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const meeting = await MeetingService.createMeeting(userId, {
      title: req.body.title,
      description: req.body.description,
      scheduledStart: req.body.scheduledStart ? new Date(req.body.scheduledStart) : undefined,
      scheduledEnd: req.body.scheduledEnd ? new Date(req.body.scheduledEnd) : undefined,
      maxParticipants: req.body.maxParticipants,
      settings: req.body.settings,
    });

    return successResponse({
      res,
      message: 'Meeting created successfully',
      data: { meeting },
    });
  } catch (error) {
    logger.error('Create meeting error', { error: (error as Error).message });
    next(error);
  }
};

export const joinMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const meeting = await MeetingService.joinMeeting(req.body.roomId, userId, {
      audioEnabled: req.body.audioEnabled,
      videoEnabled: req.body.videoEnabled,
    });

    return successResponse({
      res,
      message: 'Joined meeting successfully',
      data: { meeting },
    });
  } catch (error) {
    logger.error('Join meeting error', { error: (error as Error).message });
    next(error);
  }
};

export const leaveMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const meeting = await MeetingService.leaveMeeting(req.body.roomId, userId);

    return successResponse({
      res,
      message: 'Left meeting successfully',
      data: { meeting },
    });
  } catch (error) {
    logger.error('Leave meeting error', { error: (error as Error).message });
    next(error);
  }
};

export const updateMeetingSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const meeting = await MeetingService.updateMeetingSettings(
      req.body.roomId,
      userId,
      req.body.settings,
    );

    return successResponse({
      res,
      message: 'Meeting settings updated successfully',
      data: { meeting },
    });
  } catch (error) {
    logger.error('Update meeting settings error', { error: (error as Error).message });
    next(error);
  }
};

export const updateParticipant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // const userId = req.user!.id;
    const meeting = await MeetingService.updateParticipantSettings(
      req.body.roomId,
      req.body.userId,
      {
        audioEnabled: req.body.audioEnabled,
        videoEnabled: req.body.videoEnabled,
        screenShared: req.body.screenShared,
        role: req.body.role,
      },
    );

    return successResponse({
      res,
      message: 'Participant updated successfully',
      data: { meeting },
    });
  } catch (error) {
    logger.error('Update participant error', { error: (error as Error).message });
    next(error);
  }
};

export const muteAllParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const meeting = await MeetingService.muteAllParticipants(req.body.roomId, userId);

    return successResponse({
      res,
      message: 'All participants muted successfully',
      data: { meeting },
    });
  } catch (error) {
    logger.error('Mute all participants error', { error: (error as Error).message });
    next(error);
  }
};

export const endMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const meeting = await MeetingService.endMeeting(req.body.roomId, userId);

    return successResponse({
      res,
      message: 'Meeting ended successfully',
      data: { meeting },
    });
  } catch (error) {
    logger.error('End meeting error', { error: (error as Error).message });
    next(error);
  }
};

export const cancelMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const meeting = await MeetingService.cancelMeeting(req.body.roomId, userId);

    return successResponse({
      res,
      message: 'Meeting cancelled successfully',
      data: { meeting },
    });
  } catch (error) {
    logger.error('Cancel meeting error', { error: (error as Error).message });
    next(error);
  }
};

export const getMeetings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await MeetingService.getUserMeetings(userId, page, limit);

    return successResponse({
      res,
      message: 'Meetings retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Get meetings error', { error: (error as Error).message });
    next(error);
  }
};

export const getMeeting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meeting = await MeetingService.getMeetingByRoomId(req.params.roomId);

    if (!meeting) {
      return errorResponse({
        res,
        message: 'Meeting not found',
        statusCode: 404,
      });
    }

    return successResponse({
      res,
      message: 'Meeting retrieved successfully',
      data: { meeting },
    });
  } catch (error) {
    logger.error('Get meeting error', { error: (error as Error).message });
    next(error);
  }
};
