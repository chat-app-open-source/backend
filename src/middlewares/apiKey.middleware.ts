import { NextFunction, Request, Response } from 'express';
import { envConfig, logger } from '../config';
import { errorResponse } from '../utils';

export const validateAPIKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey || apiKey !== envConfig.apiKey) {
    logger.warn('Invalid API key attempt', { ip: req.ip, path: req.path });
    errorResponse({ res, message: 'Invalid API key', statusCode: 401 });
  }
  next();
};
