import mongoose from 'mongoose';
import type {
  ActiveSessionResponse,
  CredentialResponse,
  DeviceTokenResponse,
  EncryptionSettingsResponse,
  IUserDocument,
  NotificationSettingsResponse,
  PrivacySettingsResponse,
  SecuritySettingsResponse,
  TransformedUser,
} from '../types';
import type { Credential } from '../types/webauthn.types';

const toStringArray = (arr: mongoose.Types.ObjectId[] = []): string[] =>
  arr.map(id => id.toString());

const toBase64 = (data: Buffer | Uint8Array | null | undefined): string | null => {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data.toString('base64');
  if (data instanceof Uint8Array) return Buffer.from(data).toString('base64');
  return null;
};

export const transformUserForResponse = (user: IUserDocument | null): TransformedUser | null => {
  if (!user) return null;

  const doc = user.toObject ? user.toObject() : user;

  const privacySettings: PrivacySettingsResponse = {
    lastSeen: doc.privacySettings?.lastSeen ?? 'everyone',
    profilePhoto: doc.privacySettings?.profilePhoto ?? 'everyone',
    status: doc.privacySettings?.status ?? 'everyone',
    readReceipts: doc.privacySettings?.readReceipts ?? true,
    typingIndicators: doc.privacySettings?.typingIndicators ?? true,
    onlineStatus: doc.privacySettings?.onlineStatus ?? true,
  };

  const notificationSettings: NotificationSettingsResponse = {
    messages: doc.notificationSettings?.messages ?? true,
    groupMessages: doc.notificationSettings?.groupMessages ?? true,
    calls: doc.notificationSettings?.calls ?? true,
    mentions: doc.notificationSettings?.mentions ?? true,
    sound: doc.notificationSettings?.sound ?? true,
    vibration: doc.notificationSettings?.vibration ?? true,
    pushNotifications: doc.notificationSettings?.pushNotifications ?? true,
  };

  const securitySettings: SecuritySettingsResponse = {
    loginAlerts: doc.securitySettings?.loginAlerts ?? true,
    passwordChangeAlerts: doc.securitySettings?.passwordChangeAlerts ?? true,
    newDeviceAlerts: doc.securitySettings?.newDeviceAlerts ?? true,
    suspiciousActivityAlerts: doc.securitySettings?.suspiciousActivityAlerts ?? true,
    biometricLogin: doc.securitySettings?.biometricLogin ?? false,
    e2eEncryption: doc.securitySettings?.e2eEncryption ?? true,
  };

  const deviceTokens: DeviceTokenResponse[] = (doc.deviceTokens || []).map(
    (d: DeviceTokenResponse) => ({
      token: d.token,
      platform: d.platform,
      createdAt: d.createdAt.toISOString(),
    }),
  );

  const credentials: CredentialResponse[] = (doc.credentials || []).map((c: Credential) => ({
    id: c.id,
    publicKey: toBase64(c.publicKey),
    counter: c.counter,
    transports: c.transports || [],
    deviceType: c.deviceType,
    deviceName: c.deviceName,
    webauthnUserID: c.webauthnUserID,
    deviceTypeInternal: c.deviceTypeInternal,
    backedUp: c.backedUp,
    createdAt: c.createdAt.toISOString(),
    lastUsed: c.lastUsed ? c.lastUsed.toISOString() : null,
  }));

  const activeSessions: ActiveSessionResponse[] = (doc.activeSessions || []).map(
    (s: ActiveSessionResponse) => ({
      sessionId: s.sessionId,
      deviceType: s.deviceType,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      lastActivity: s.lastActivity.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }),
  );

  const encryptionSettings: EncryptionSettingsResponse = {
    algorithm: doc.encryptionSettings?.algorithm || 'x25519-xsalsa20-poly1305',
    keyRotationInterval: doc.encryptionSettings?.keyRotationInterval || 30 * 24 * 60 * 60 * 1000,
    lastKeyRotation:
      doc.encryptionSettings?.lastKeyRotation?.toISOString() || new Date().toISOString(),
  };

  return {
    id: doc._id.toString(),
    email: doc.email,
    username: doc.username,
    firstName: doc.firstName,
    lastName: doc.lastName,
    phoneNumber: doc.phoneNumber || null,
    dateOfBirth: doc.dateOfBirth ? doc.dateOfBirth.toISOString() : null,
    profilePicture: doc.profilePicture || null,
    coverPhoto: doc.coverPhoto || null,
    bio: doc.bio || null,
    status: doc.status,
    lastSeen: doc.lastSeen.toISOString(),
    isVerified: doc.isVerified,
    language: doc.language,
    country: doc.country || null,
    gender: doc.gender || null,
    oauthProvider: doc.oauthProvider || null,
    oauthId: doc.oauthId || null,

    privacySettings,
    notificationSettings,
    securitySettings,

    deviceTokens,
    subscribedTopics: doc.subscribedTopics || [],
    contacts: toStringArray(doc.contacts),
    blockedUsers: toStringArray(doc.blockedUsers),
    groups: toStringArray(doc.groups),
    callHistory: toStringArray(doc.callHistory),
    twoFactorBackupCodes: [], // never expose
    credentials,
    activeSessions,

    publicKey: doc.publicKey || '',
    encryptionSettings,

    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),

    isLocked: doc.isLocked || false,
    lockUntil: doc.lockUntil ? doc.lockUntil.toISOString() : null,
    lockReason: doc.lockReason || null,
    lockCount: doc.lockCount || 0,
    twoFactorEnabled: doc.twoFactorEnabled || false,
  };
};
