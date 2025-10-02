import path from 'path';

import dotenv from 'dotenv';

import type { EnvConfig, OAuthConfig } from '../types/env.types';

// Load environment variables ONCE here
const envFile = process.env.NODE_ENV === 'prod' ? '.env' : '.env.dev';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const envConfig: EnvConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGO_URI || '',
  apiKey: process.env.API_KEY || 'default-api-key-for-development',

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtExpire: process.env.JWT_EXPIRE || '1h',
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d',

  // Email Configuration
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpService: process.env.SMTP_SERVICE || 'gmail',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  fromEmail: process.env.FROM_EMAIL || '',
  fromName: process.env.FROM_NAME || 'Chat App',

  // OAuth Configuration - FIXED CALLBACK URL
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET || '',

  // Firebase (optional)
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  storageBucket: process.env.STORAGE_BUCKET || '',

  encryptionKey: process.env.ENCRYPTION_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  mockOAuthEnabled: process.env.MOCK_OAUTH_ENABLED === 'true',
};

// FIXED: Correct callback URL path
export const oauthConfig: OAuthConfig = {
  google: {
    clientID: envConfig.googleClientId,
    clientSecret: envConfig.googleClientSecret,
    callbackURL: `${envConfig.clientUrl}/api/v1/auth/google/callback`,
  },
  facebook: {
    clientID: envConfig.facebookAppId,
    clientSecret: envConfig.facebookAppSecret,
    callbackURL: `${envConfig.clientUrl}/api/v1/auth/facebook/callback`,
  },
};
