import path from 'path';
import compression from 'compression';
import cors from 'cors';
import type { Express, Request, Response } from 'express';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler, healthCheckBypass } from '../middlewares';
import routes from '../routes';
import { getApiLockStatus, testEmailConnection } from '../services';
import { errorResponse, getApiEndpointsInfo, successResponse, testRedisConnection } from '../utils';
import { envConfig } from './env';
import logger, { morganStream } from './logger';
import passport from './passport';

const app: Express = express();
// Serve static files from src directory
app.use(express.static(path.join(__dirname, '..')));

// Root route serves the chat interface
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});
// ==================== MIDDLEWARE SETUP ====================

// CORS
app.use(
  cors({
    origin: envConfig.clientUrl || 'http://localhost:3000',
    credentials: true,
  }),
);

// Security headers
app.use((_req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Use Helmet and Compression
app.use(helmet());
app.use(compression());

// Request logging with Morgan
app.use(morgan('combined', { stream: morganStream }));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize passport
app.use(passport.initialize());

// Apply API key validation middleware (bypasses /api/v1/health)
app.use(healthCheckBypass);

// ==================== ROUTES ====================

// Health check endpoint
app.get('/api/v1/health', async (req: Request, res: Response) => {
  try {
    const [emailStatus, rateLimitStatus, redisStatus] = await Promise.all([
      testEmailConnection(),
      getApiLockStatus(req.ip ?? 'unknown'),
      testRedisConnection(),
    ]);

    const healthData = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: envConfig.nodeEnv,
      emailService: emailStatus ? 'connected' : 'disconnected',
      rateLimitStatus: rateLimitStatus?.isLocked ? 'locked' : 'active',
      redis: redisStatus ? 'connected' : 'disconnected',
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      apiEndpoints: Object.keys(getApiEndpointsInfo()).length,
    };

    return successResponse({
      res,
      statusCode: 200,
      message: 'Server is running',
      data: healthData,
    });
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message });
    return errorResponse({
      res,
      statusCode: 500,
      message: 'Health check failed',
      details: { error: (error as Error).message },
    });
  }
});

// main routes
app.use('/api/v1', routes);

// ==================== ERROR HANDLERS ====================

// Catch-all 404 handler
app.use((req: Request, res: Response) =>
  errorResponse({
    res,
    statusCode: 404,
    message: 'Resource not found',
    details: { url: req.originalUrl, method: req.method },
  }),
);

// Global error handler
app.use(errorHandler);

export default app;
