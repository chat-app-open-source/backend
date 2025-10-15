import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { CallService } from '../services';
import { errorResponse, successResponse } from '../utils';

export const initiateCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    let call;

    if (req.body.meetingId) {
      call = await CallService.initiateMeetingCall(
        userId,
        req.body.meetingId,
        req.body.type,
        req.body.offer,
      );
    } else {
      if (!req.body.conversationId || !req.body.participants) {
        return errorResponse({
          res,
          message: 'Conversation ID and participants are required for regular calls',
          statusCode: 400,
        });
      }

      call = await CallService.initiateCall(
        userId,
        req.body.conversationId,
        req.body.type,
        req.body.participants,
        req.body.offer,
      );
    }

    return successResponse({
      res,
      message: 'Call initiated successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('Initiate call error', { error: (error as Error).message });
    next(error);
  }
};

export const acceptCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const call = await CallService.acceptCall(req.body.callId, userId, req.body.answer);

    return successResponse({
      res,
      message: 'Call accepted successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('Accept call error', { error: (error as Error).message });
    next(error);
  }
};

export const rejectCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const call = await CallService.rejectCall(req.body.callId, userId, req.body.reason);

    return successResponse({
      res,
      message: 'Call rejected successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('Reject call error', { error: (error as Error).message });
    next(error);
  }
};

export const endCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const call = await CallService.endCall(req.body.callId, userId);

    return successResponse({
      res,
      message: 'Call ended successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('End call error', { error: (error as Error).message });
    next(error);
  }
};

export const joinCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const call = await CallService.joinCall(req.body.callId, userId);

    return successResponse({
      res,
      message: 'Joined call successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('Join call error', { error: (error as Error).message });
    next(error);
  }
};

export const leaveCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const call = await CallService.leaveCall(req.body.callId, userId);

    return successResponse({
      res,
      message: 'Left call successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('Leave call error', { error: (error as Error).message });
    next(error);
  }
};

export const toggleAudio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const call = await CallService.toggleAudio(req.body.callId, userId, req.body.enabled);

    return successResponse({
      res,
      message: 'Audio toggled successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('Toggle audio error', { error: (error as Error).message });
    next(error);
  }
};

export const toggleVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const call = await CallService.toggleVideo(req.body.callId, userId, req.body.enabled);

    return successResponse({
      res,
      message: 'Video toggled successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('Toggle video error', { error: (error as Error).message });
    next(error);
  }
};

export const toggleScreenShare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const call = await CallService.toggleScreenShare(req.body.callId, userId, req.body.sharing);

    return successResponse({
      res,
      message: 'Screen share toggled successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('Toggle screen share error', { error: (error as Error).message });
    next(error);
  }
};

export const getCallHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await CallService.getCallHistory(userId, page, limit);

    return successResponse({
      res,
      message: 'Call history retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Get call history error', { error: (error as Error).message });
    next(error);
  }
};

export const getActiveCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const call = await CallService.getActiveCall(req.params.callId);

    if (!call) {
      return errorResponse({
        res,
        message: 'Active call not found',
        statusCode: 404,
      });
    }

    return successResponse({
      res,
      message: 'Active call retrieved successfully',
      data: { call },
    });
  } catch (error) {
    logger.error('Get active call error', { error: (error as Error).message });
    next(error);
  }
};
