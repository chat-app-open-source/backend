import type { NextFunction, Request, Response } from 'express';

import logger from '../config/logger';
import { User } from '../models';
import { verifyAccessToken } from '../services';
import type { IUserDocument } from '../types';
import { errorResponse } from '../utils';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUserDocument;
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (typeof payload.userId !== 'string') {
      throw new Error('Invalid token payload');
    }

    const user = await User.findById(payload.userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    req.user = user;
    next();
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Authentication error', { error: err.message, ip: req.ip });
    errorResponse({ res, message: err.message, statusCode: 401 });
  }
};
