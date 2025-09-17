import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';

import { connectDB, logger } from './config';
import { errorHandler } from './middlewares';
import { errorResponse, successResponse } from './utils';

const envFile = process.env.NODE_ENV === 'dev' ? '.env.dev' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const app: Express = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req: Request, res: Response) =>
  successResponse({
    res,
    statusCode: 200,
    message: 'Server is running',
    data: { uptime: process.uptime(), timestamp: new Date() },
  }),
);

// Catch-all 404 handler
app.use((_req: Request, res: Response) =>
  errorResponse({
    res,
    statusCode: 404,
    message: 'Resource not found',
    details: { url: _req.originalUrl, method: _req.method },
  }),
);

// Global error handler
app.use(errorHandler);

// Start server and connect to MongoDB
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();
