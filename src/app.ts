import compression from 'compression';
import cors from 'cors';
import type { Express, Request, Response } from 'express';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB, envConfig, logger, morganStream, passport } from './config';
import { errorHandler } from './middlewares';
import routes from './routes';
import { getApiLockStatus, testEmailConnection } from './services';
import {
  errorResponse,
  getApiEndpointsInfo,
  logAvailableEndpoints,
  successResponse,
} from './utils';

const app: Express = express();

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

// ==================== ROUTES ====================

// Use the main routes
app.use('/api/v1', routes);

// ==================== HEALTH CHECK ====================

app.get('/api/v1/health', async (req: Request, res: Response) => {
  try {
    const [emailStatus, rateLimitStatus] = await Promise.all([
      testEmailConnection(),
      getApiLockStatus(req.ip ?? 'unknown'),
    ]);

    const healthData = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: envConfig.nodeEnv,
      emailService: emailStatus ? 'connected' : 'disconnected',
      rateLimitStatus: rateLimitStatus?.isLocked ? 'locked' : 'active',
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

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await connectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await connectDB();
  process.exit(0);
});

// ==================== START SERVER ====================

const PORT = envConfig.port;

const startServer = async (): Promise<void> => {
  try {
    logger.info('🔄 Starting ChatApp Backend...');
    await connectDB();

    // Log endpoints after logger is fully initialized
    logAvailableEndpoints(logger);

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📧 Client URL: ${envConfig.clientUrl}`);
      logger.info(`🔐 Environment: ${envConfig.nodeEnv}`);
      logger.info(`🛡️ API Key protection: Enabled with rate limiting`);
      logger.info(`📊 Total API Endpoints: ${Object.keys(getApiEndpointsInfo()).length}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
};

startServer();
