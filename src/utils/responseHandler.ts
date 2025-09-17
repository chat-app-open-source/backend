/* eslint-disable @typescript-eslint/no-explicit-any */

import { ErrorResponseOptions, SuccessResponseOptions } from '../types';

export const successResponse = <T = any>({
  res,
  statusCode = 200,
  message = 'Success',
  data = null,
  meta = {},
}: SuccessResponseOptions<T>) =>
    res.status(statusCode).json({
      status: 'success',
      statusCode,
      message,
      data,
      meta,
    });

export const errorResponse = <T = any>({
  res,
  statusCode = 500,
  message = 'Something went wrong',
  details = null,
  errorCode,
  meta = {},
}: ErrorResponseOptions<T>) =>
    res.status(statusCode).json({
      status: 'error',
      statusCode,
      message,
      details,
      errorCode,
      meta,
    });
