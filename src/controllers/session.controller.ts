import type { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { SessionService } from '../services';
import { errorResponse, successResponse } from '../utils';

export const getSessions = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const userId = req.user.id;
    const sessions = await SessionService.getUserSessions(userId);

    return successResponse({
      res,
      message: 'Sessions retrieved successfully',
      data: { sessions },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get sessions error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const terminateSession = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { sessionId } = req.params;
    const userId = req.user.id;

    const success = await SessionService.terminateSession(userId, sessionId);

    if (!success) {
      return errorResponse({
        res,
        message: 'Session not found or already terminated',
        statusCode: 404,
      });
    }

    return successResponse({
      res,
      message: 'Session terminated successfully',
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Terminate session error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};

export const terminateOtherSessions = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    if (!req.user || typeof req.user.id !== 'string') {
      return errorResponse({
        res,
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    const { currentSessionId } = req.body;
    const userId = req.user.id;

    if (!currentSessionId) {
      return errorResponse({
        res,
        message: 'Current session ID is required',
        statusCode: 400,
      });
    }

    const terminatedCount = await SessionService.terminateOtherSessions(userId, currentSessionId);

    return successResponse({
      res,
      message: `Terminated ${terminatedCount} other sessions`,
      data: { terminatedCount },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Terminate other sessions error', { error: err.message });
    return errorResponse({ res, message: err.message, statusCode: 400 });
  }
};
