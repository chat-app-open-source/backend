import path from 'path';
import dotenv from 'dotenv';
import { EnvConfig, OAuthConfig } from '../types/env.types';

// Load environment variables ONCE here
const envFile = process.env.NODE_ENV === 'dev' ? '.env.dev' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const envConfig: EnvConfig = {
  nodeEnv: process.env.NODE_ENV || '',
  port: parseInt(process.env.PORT || '8080', 10),
  clientUrl: process.env.CLIENT_URL || '',
  mongoUri: process.env.MONGO_URI || '',
  apiKey: process.env.API_KEY || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtExpire: process.env.JWT_EXPIRE || '',
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  storageBucket: process.env.STORAGE_BUCKET || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpService: process.env.SMTP_SERVICE || '',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  fromEmail: process.env.FROM_EMAIL || '',
  fromName: process.env.FROM_NAME || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  logLevel: process.env.LOG_LEVEL || '',
};

export const oauthConfig: OAuthConfig = {
  google: {
    clientID: envConfig.googleClientId,
    clientSecret: envConfig.googleClientSecret,
    callbackURL: `${envConfig.clientUrl}/api/auth/google/callback`,
  },
  facebook: {
    clientID: envConfig.facebookAppId,
    clientSecret: envConfig.facebookAppSecret,
    callbackURL: `${envConfig.clientUrl}/api/auth/facebook/callback`,
  },
};
