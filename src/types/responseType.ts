/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';

export interface SuccessResponseOptions<T = any> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T | null;
  meta?: Record<string, any>;
}

export interface ErrorResponseOptions<T = any> {
  res: Response;
  statusCode?: number;
  message?: string;
  details?: T | null;
  errorCode?: string | number;
  meta?: Record<string, any>;
}
