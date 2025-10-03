import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

import { defaultLogger } from '../config/logger';
import { errorResponse } from '../utils';

export const validate =
  (schema: ZodType) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse and transform the request body
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: unknown) {
      // Handle Zod validation errors specifically
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        defaultLogger.error('Validation error', {
          errors: formattedErrors,
          requestBody: req.body,
          endpoint: req.path,
        });

        errorResponse({
          res,
          statusCode: 400,
          message: 'Validation failed',
          details: formattedErrors,
        });
      } else {
        // Handle other types of errors
        defaultLogger.error('Unexpected validation error', {
          error: (error as Error).message || String(error),
          requestBody: req.body,
          endpoint: req.path,
        });

        errorResponse({
          res,
          statusCode: 400,
          message: 'Validation failed',
          details: [{ message: 'Invalid request format' }],
        });
      }
    }
  };
