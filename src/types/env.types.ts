export interface EnvConfig {
  nodeEnv: string;
  port: number;
  clientUrl: string;
  mongoUri: string;
  apiKey: string;

  // JWT Configuration
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpire: string;
  jwtRefreshExpire: string;

  // Firebase Configuration
  firebaseProjectId: string;
  firebasePrivateKey: string;
  firebaseClientEmail: string;
  storageBucket: string;

  // Email Configuration
  smtpHost: string;
  smtpPort: number;
  smtpService: string;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;

  // OAuth Configuration (Main - Fallback)
  googleClientId: string;
  googleClientSecret: string;
  facebookAppId: string;
  facebookAppSecret: string;

  // Platform-specific OAuth (Optional)
  googleClientIdWeb?: string;
  googleClientIdMobile?: string;
  facebookAppIdWeb?: string;
  facebookAppIdMobile?: string;

  // Encryption
  encryptionKey: string;

  // Logging & Development
  logLevel: string;
  mockOAuthEnabled: boolean;
}

export interface OAuthConfig {
  google: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    webClientID?: string;
    mobileClientID?: string;
  };
  facebook: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    webClientID?: string;
    mobileClientID?: string;
  };
}
