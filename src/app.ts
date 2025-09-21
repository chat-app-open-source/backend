import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import passport from 'passport';

import { connectDB, logger } from './config';
import { envConfig } from './config/env.config';
import { errorHandler, validateAPIKey } from './middlewares';
import { authRoutes } from './routes';
import { testEmailConnection } from './services';
import { errorResponse, successResponse } from './utils';

// const envFile = envConfig.nodeEnv === 'dev' ? '.env.dev' : '.env';
// dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const app: Express = express();

// Middleware
app.use(
  cors({
    origin: envConfig.clientUrl || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());
app.use(validateAPIKey);

// Routes
const apiVersion_1 = '/api/v1';
app.use(`${apiVersion_1}/auth`, authRoutes);

// Health check
app.get('/api/health', async (_req: Request, res: Response) => {
  const emailStatus = await testEmailConnection();
  return successResponse({
    res,
    statusCode: 200,
    message: 'Server is running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date(),
      environment: envConfig.nodeEnv,
      emailService: emailStatus ? 'connected' : 'disconnected',
    },
  });
});

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

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await connectDB(); // Ensure DB connection for cleanup
  process.exit(0);
});

// Start server and connect to MongoDB
const PORT = envConfig.port;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📧 Client URL: ${envConfig.clientUrl}`);
      logger.info(`🔐 Environment: ${envConfig.nodeEnv}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
};

startServer();

export default app;
