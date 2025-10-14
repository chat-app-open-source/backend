export interface EnvConfig {
  nodeEnv: string;
  port: number;
  clientUrl: string;
  mongoUri: string;
  apiKey: string;
  apiKeyRequestLimit: number;

  // JWT
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpire: string;
  jwtRefreshExpire: string;

  // Email
  smtpHost: string;
  smtpPort: number;
  smtpService: string;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;

  // OAuth
  googleClientId: string;
  googleClientSecret: string;
  facebookAppId: string;
  facebookAppSecret: string;

  // Firebase
  firebaseProjectId: string;
  firebasePrivateKey: string;
  firebaseClientEmail: string;
  storageBucket: string;

  // Redis
  redisHost: string;
  redisPort: number;
  redisPassword: string;

  // APNS
  apnsKeyId: string;
  apnsTeamId: string;
  apnsBundleId: string;
  apnsKey: string;

  // Rate Limiting
  rateLimitLoginAttempts: number;
  rateLimitLoginWindowMs: number;
  rateLimit2FAAttempts: number;
  rateLimit2FAWindowMs: number;

  // Session Management
  sessionTTLDays: number;
  inactiveSessionTimeoutMinutes: number;

  // Encryption
  encryptionKey: string;

  // Logging
  logLevel: string;
  mockOAuthEnabled: boolean;

  // Cleanup
  apiAttemptRetentionDays: number;
  loginAttemptRetentionDays: number;

  // WebAuthn Configuration for Biometric (Passkeys)
  rpId: string;
  rpName: string;
  origin: string;
  expectedOrigins: string[];
  userVerification: string;
  attestationType: string;
}

export interface OAuthConfig {
  google: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  };
  facebook: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  };
}
