import type {
  AuthenticatorTransportFuture,
  Base64URLString,
  CredentialDeviceType,
  WebAuthnCredential as SimpleWebAuthnCredential,
} from '@simplewebauthn/types';

export interface Credential {
  id: Base64URLString;
  publicKey: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType: 'web' | 'android' | 'ios';
  deviceName: string;
  createdAt: Date;
  lastUsed?: Date;
  webauthnUserID: Base64URLString;
  deviceTypeInternal: CredentialDeviceType;
  backedUp: boolean;
}

export interface WebAuthnRegistrationOptions {
  rpName: string;
  rpID: string;
  userName: string;
  userID: Uint8Array;
  attestationType: 'none' | 'direct' | 'indirect' | 'enterprise';
  excludeCredentials: Array<{
    id: Base64URLString;
    type: 'public-key';
    transports?: AuthenticatorTransportFuture[];
  }>;
  authenticatorSelection: {
    residentKey: 'discouraged' | 'preferred' | 'required';
    userVerification: 'required' | 'preferred' | 'discouraged';
    authenticatorAttachment?: 'platform' | 'cross-platform';
  };
  supportedAlgorithmIDs: number[];
  timeout?: number;
  challenge?: string;
  userDisplayName?: string;
}

export interface WebAuthnAuthenticationOptions {
  rpID: string;
  allowCredentials: Array<{
    id: Base64URLString;
    type: 'public-key';
    transports?: AuthenticatorTransportFuture[];
  }>;
  userVerification: 'required' | 'preferred' | 'discouraged';
  timeout?: number;
  challenge?: string;
}

export interface BiometricRegistrationRequest {
  deviceName: string;
  deviceType: 'web' | 'android' | 'ios';
}

export interface BiometricLoginRequest {
  email: string;
  response: {
    id: Base64URLString;
    rawId: Base64URLString;
    response: {
      authenticatorData: Base64URLString;
      clientDataJSON: Base64URLString;
      signature: Base64URLString;
      userHandle?: Base64URLString;
    };
    type: 'public-key';
    clientExtensionResults: Record<string, unknown>;
    authenticatorAttachment?: 'platform' | 'cross-platform';
  };
  deviceToken?: string;
  platform?: 'web' | 'android' | 'ios';
}

// Enhanced types for production
export interface BiometricSession {
  sessionId: string;
  userId: string;
  credentialId: string;
  deviceType: 'web' | 'android' | 'ios';
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

export interface BiometricAuditLog {
  userId: string;
  action: 'registration' | 'authentication' | 'removal';
  credentialId: string;
  deviceType: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface StoredCredential extends Omit<Credential, 'publicKey'> {
  publicKey: Buffer;
}

// Re-export commonly used types
export type {
  AuthenticatorTransportFuture,
  Base64URLString,
  CredentialDeviceType,
  SimpleWebAuthnCredential,
};
