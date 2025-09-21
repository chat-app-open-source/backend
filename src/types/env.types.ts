export interface EnvConfig {
  nodeEnv: string;
  port: number;
  clientUrl: string;
  mongoUri: string;
  apiKey: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpire: string;
  jwtRefreshExpire: string;
  firebaseProjectId: string;
  firebasePrivateKey: string;
  firebaseClientEmail: string;
  storageBucket: string;
  smtpHost: string;
  smtpPort: number;
  smtpService: string;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  googleClientId: string;
  googleClientSecret: string;
  facebookAppId: string;
  facebookAppSecret: string;
  encryptionKey: string;
  logLevel: string;
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
