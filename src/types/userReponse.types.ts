export interface DeviceTokenResponse {
  token: string;
  platform: 'web' | 'android' | 'ios';
  createdAt: Date;
}

export interface CredentialResponse {
  id: string;
  publicKey: string | null;
  counter: number;
  transports: string[];
  deviceType: 'web' | 'android' | 'ios';
  deviceName: string;
  webauthnUserID: string;
  deviceTypeInternal: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  createdAt: Date;
  lastUsed: Date | null;
}

export interface ActiveSessionResponse {
  sessionId: string;
  deviceType: 'web' | 'mobile' | 'desktop';
  userAgent: string;
  ipAddress: string;
  lastActivity: Date;
  createdAt: Date;
}

export interface PrivacySettingsResponse {
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  profilePhoto: 'everyone' | 'contacts' | 'nobody';
  status: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  typingIndicators: boolean;
  onlineStatus: boolean;
}

export interface NotificationSettingsResponse {
  messages: boolean;
  groupMessages: boolean;
  calls: boolean;
  mentions: boolean;
  sound: boolean;
  vibration: boolean;
  pushNotifications: boolean;
}

export interface SecuritySettingsResponse {
  loginAlerts: boolean;
  passwordChangeAlerts: boolean;
  newDeviceAlerts: boolean;
  suspiciousActivityAlerts: boolean;
  biometricLogin: boolean;
  e2eEncryption: boolean;
}

export interface EncryptionSettingsResponse {
  algorithm: string;
  keyRotationInterval: number;
  lastKeyRotation: string;
}

export interface TransformedUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  profilePicture: string | null;
  coverPhoto: string | null;
  bio: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: string;
  isVerified: boolean;
  language: string;
  country: string | null;
  gender: 'male' | 'female' | 'other' | null;
  oauthProvider: 'google' | 'facebook' | null;
  oauthId: string | null;

  privacySettings: PrivacySettingsResponse;
  notificationSettings: NotificationSettingsResponse;
  securitySettings: SecuritySettingsResponse;

  deviceTokens: DeviceTokenResponse[];
  subscribedTopics: string[];
  contacts: string[];
  blockedUsers: string[];
  groups: string[];
  callHistory: string[];
  twoFactorBackupCodes: string[];
  credentials: CredentialResponse[];
  activeSessions: ActiveSessionResponse[];

  publicKey: string;
  encryptionSettings: EncryptionSettingsResponse;

  createdAt: string;
  updatedAt: string;

  isLocked: boolean;
  lockUntil: string | null;
  lockReason: 'excessive_failed_attempts' | 'excessive_successful_logins' | null;
  lockCount: number;
  twoFactorEnabled: boolean;
}

export interface UserResponse {
  user: TransformedUser;
}

export interface UsersResponse {
  users: TransformedUser[];
  query?: string;
  count: number;
}

export interface DeleteAccountResponse {
  message: string;
  deleted: boolean;
}

export interface StatusResponse {
  status: string;
  lastSeen: string;
}

export interface PrivacySettingsUpdateResponse {
  privacySettings: PrivacySettingsResponse;
}

export interface NotificationSettingsUpdateResponse {
  notificationSettings: NotificationSettingsResponse;
}

export interface SecuritySettingsUpdateResponse {
  securitySettings: SecuritySettingsResponse;
}
