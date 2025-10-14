import path from 'path';
import dotenv from 'dotenv';
import type { EnvConfig, OAuthConfig } from '../types';

// Load environment variables ONCE here
const envFile = process.env.NODE_ENV === 'prod' ? '.env' : '.env.dev';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const envConfig: EnvConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongoUri: process.env.MONGO_URI || '',
  apiKey: process.env.API_KEY || 'default-api-key-for-development',
  apiKeyRequestLimit: parseInt(process.env.API_KEY_REQUEST_LIMIT || '50', 10),

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

  // OAuth Configuration
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET || '',

  // Firebase
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  storageBucket: process.env.STORAGE_BUCKET || '',

  // Redis Configuration
  redisHost: process.env.REDIS_HOST || 'redis',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || 'chatapp_redis_2025',

  // APNS Configuration
  apnsKeyId: process.env.APNS_KEY_ID || '',
  apnsTeamId: process.env.APNS_TEAM_ID || '',
  apnsBundleId: process.env.APNS_BUNDLE_ID || '',
  apnsKey: process.env.APNS_KEY?.replace(/\\n/g, '\n') || '',

  // Rate Limiting
  rateLimitLoginAttempts: parseInt(process.env.RATE_LIMIT_LOGIN_ATTEMPTS || '5', 10),
  rateLimitLoginWindowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '900000', 10),
  rateLimit2FAAttempts: parseInt(process.env.RATE_LIMIT_2FA_ATTEMPTS || '3', 10),
  rateLimit2FAWindowMs: parseInt(process.env.RATE_LIMIT_2FA_WINDOW_MS || '300000', 10),

  // Session Management
  sessionTTLDays: parseInt(process.env.SESSION_TTL_DAYS || '7', 10),
  inactiveSessionTimeoutMinutes: parseInt(process.env.INACTIVE_SESSION_TIMEOUT_MINUTES || '30', 10),

  // WebAuthn Configuration
  rpId: process.env.RP_ID || 'localhost',
  rpName: process.env.RP_NAME || 'Chat App',
  origin: process.env.ORIGIN || 'http://localhost:3000',
  expectedOrigins: process.env.EXPECTED_ORIGINS?.split(',') || ['http://localhost:3000'],
  userVerification: process.env.USER_VERIFICATION || 'required',
  attestationType: process.env.ATTESTATION_TYPE || 'none',

  encryptionKey: process.env.ENCRYPTION_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  mockOAuthEnabled: process.env.MOCK_OAUTH_ENABLED === 'true',

  // Cleanup Configuration
  apiAttemptRetentionDays: parseInt(process.env.API_ATTEMPT_RETENTION_DAYS || '1', 10),
  loginAttemptRetentionDays: parseInt(process.env.LOGIN_ATTEMPT_RETENTION_DAYS || '30', 10),
};

// OAuth Configuration
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
