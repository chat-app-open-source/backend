import { Response } from 'express';
import { IUserDocument } from './auth.types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUserDocument;
  }
}

export interface SuccessResponseOptions<T = unknown> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T | null;
  meta?: Record<string, unknown>;
}

export interface ErrorResponseOptions<T = unknown> {
  res: Response;
  statusCode?: number;
  message?: string;
  details?: T | null;
  errorCode?: string | number;
  meta?: Record<string, unknown>;
}
