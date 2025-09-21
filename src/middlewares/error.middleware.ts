import { NextFunction, Request, Response } from 'express';
import { logger } from '../config';

interface CustomError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(message, { error: err.stack });

  res.status(statusCode).json({
    status: 'error',
    message,
  });
};
