/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ErrorResponseOptions, SuccessResponseOptions } from '../types';

export const successResponse = <T = any>({
  res,
  statusCode = 200,
  message = 'Success',
  data = null,
  meta = {},
}: SuccessResponseOptions<T>) => {
  const response = {
    status: 'success' as const,
    statusCode,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};

export const errorResponse = <T = any>({
  res,
  statusCode = 500,
  message = 'Something went wrong',
  details = null,
  errorCode,
  meta = {},
}: ErrorResponseOptions<T>) => {
  const response = {
    status: 'error' as const,
    statusCode,
    message,
    details,
    errorCode,
    meta,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};
