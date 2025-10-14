/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ApiEndpointInfo {
  path: string;
  method: string;
  description: string;
  requiresAuth?: boolean;
  requiresApiKey?: boolean;
  group: string; // New field to categorize endpoints
}

// Define endpoint groups
const ENDPOINT_GROUPS = {
  AUTHENTICATION: 'Authentication',
  BIOMETRIC: 'Biometric Authentication',
  OAUTH: 'OAuth',
  SESSION: 'Session Management',
  TWO_FACTOR: 'Two-Factor Authentication',
  HEALTH: 'Health Check',
  UTILITY: 'Utility',
} as const;

// Define endpoint configurations
const apiEndpoints: Record<string, ApiEndpointInfo> = {
  // Authentication Endpoints
  'POST /api/v1/auth/register': {
    path: '/api/v1/auth/register',
    method: 'POST',
    description: 'Register a new user account with email and password',
    requiresAuth: false,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/verify-email': {
    path: '/api/v1/auth/verify-email',
    method: 'POST',
    description: 'Verify user email with OTP',
    requiresAuth: false,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/login': {
    path: '/api/v1/auth/login',
    method: 'POST',
    description: 'User login with email and password',
    requiresAuth: false,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/resend-otp': {
    path: '/api/v1/auth/resend-otp',
    method: 'POST',
    description: 'Resend verification OTP for email verification',
    requiresAuth: false,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/refresh-token': {
    path: '/api/v1/auth/refresh-token',
    method: 'POST',
    description: 'Refresh access token using refresh token',
    requiresAuth: false,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/forgot-password': {
    path: '/api/v1/auth/forgot-password',
    method: 'POST',
    description: 'Request OTP for password reset',
    requiresAuth: false,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/verify-password-reset-otp': {
    path: '/api/v1/auth/verify-password-reset-otp',
    method: 'POST',
    description: 'Verify OTP for password reset',
    requiresAuth: false,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/reset-password': {
    path: '/api/v1/auth/reset-password',
    method: 'POST',
    description: 'Reset password with new password after OTP verification',
    requiresAuth: false,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/change-password': {
    path: '/api/v1/auth/change-password',
    method: 'POST',
    description: 'Change current user password',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/logout': {
    path: '/api/v1/auth/logout',
    method: 'POST',
    description: 'Logout current device/session',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/logout-all': {
    path: '/api/v1/auth/logout-all',
    method: 'POST',
    description: 'Logout from all devices/sessions',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/subscribe-topic': {
    path: '/api/v1/auth/subscribe-topic',
    method: 'POST',
    description: 'Subscribe user to a notification topic',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/unsubscribe-topic': {
    path: '/api/v1/auth/unsubscribe-topic',
    method: 'POST',
    description: 'Unsubscribe user from a notification topic',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },

  // Biometric Authentication Endpoints
  'POST /api/v1/biometric/login': {
    path: '/api/v1/biometric/login',
    method: 'POST',
    description: 'Login using biometric authentication (Face ID/Fingerprint)',
    requiresAuth: false,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'GET /api/v1/biometric/status': {
    path: '/api/v1/biometric/status',
    method: 'GET',
    description: 'Get biometric authentication status for current user',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'GET /api/v1/biometric/credentials': {
    path: '/api/v1/biometric/credentials',
    method: 'GET',
    description: 'Get all registered biometric credentials for current user',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'POST /api/v1/biometric/registration/options': {
    path: '/api/v1/biometric/registration/options',
    method: 'POST',
    description: 'Generate biometric registration options for new device',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'POST /api/v1/biometric/registration/verify': {
    path: '/api/v1/biometric/registration/verify',
    method: 'POST',
    description: 'Verify and complete biometric registration',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'POST /api/v1/biometric/authentication/challenge': {
    path: '/api/v1/biometric/authentication/challenge',
    method: 'POST',
    description: 'Generate biometric authentication challenge',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'POST /api/v1/biometric/authentication/verify': {
    path: '/api/v1/biometric/authentication/verify',
    method: 'POST',
    description: 'Verify biometric authentication challenge response',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'POST /api/v1/biometric/credentials/remove': {
    path: '/api/v1/biometric/credentials/remove',
    method: 'POST',
    description: 'Remove a specific biometric credential',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },

  // OAuth Endpoints
  'GET /api/v1/auth/google': {
    path: '/api/v1/auth/google',
    method: 'GET',
    description: 'Initiate Google OAuth login flow',
    requiresAuth: false,
    requiresApiKey: false,
    group: ENDPOINT_GROUPS.OAUTH,
  },
  'GET /api/v1/auth/google/callback': {
    path: '/api/v1/auth/google/callback',
    method: 'GET',
    description: 'Handle Google OAuth callback and complete authentication',
    requiresAuth: false,
    requiresApiKey: false,
    group: ENDPOINT_GROUPS.OAUTH,
  },
  'GET /api/v1/auth/facebook': {
    path: '/api/v1/auth/facebook',
    method: 'GET',
    description: 'Initiate Facebook OAuth login flow',
    requiresAuth: false,
    requiresApiKey: false,
    group: ENDPOINT_GROUPS.OAUTH,
  },
  'GET /api/v1/auth/facebook/callback': {
    path: '/api/v1/auth/facebook/callback',
    method: 'GET',
    description: 'Handle Facebook OAuth callback and complete authentication',
    requiresAuth: false,
    requiresApiKey: false,
    group: ENDPOINT_GROUPS.OAUTH,
  },

  // Session Management Endpoints
  'GET /api/v1/sessions': {
    path: '/api/v1/sessions',
    method: 'GET',
    description: 'Retrieve all active sessions for the authenticated user',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.SESSION,
  },
  'DELETE /api/v1/sessions/:sessionId': {
    path: '/api/v1/sessions/:sessionId',
    method: 'DELETE',
    description: 'Terminate a specific user session',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.SESSION,
  },
  'POST /api/v1/sessions/terminate-others': {
    path: '/api/v1/sessions/terminate-others',
    method: 'POST',
    description: 'Terminate all sessions except the current one',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.SESSION,
  },

  // Two-Factor Authentication (2FA) Endpoints
  'POST /api/v1/2fa/enable': {
    path: '/api/v1/2fa/enable',
    method: 'POST',
    description: 'Initiate 2FA setup with QR code and backup codes',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.TWO_FACTOR,
  },
  'POST /api/v1/2fa/verify': {
    path: '/api/v1/2fa/verify',
    method: 'POST',
    description: 'Verify 2FA setup with TOTP token',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.TWO_FACTOR,
  },
  'POST /api/v1/2fa/disable': {
    path: '/api/v1/2fa/disable',
    method: 'POST',
    description: 'Disable 2FA for the authenticated user',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.TWO_FACTOR,
  },
  'POST /api/v1/2fa/backup-codes/generate': {
    path: '/api/v1/2fa/backup-codes/generate',
    method: 'POST',
    description: 'Generate new 2FA backup codes',
    requiresAuth: true,
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.TWO_FACTOR,
  },

  // Health Check Endpoint
  'GET /api/health': {
    path: '/api/health',
    method: 'GET',
    description: 'Check server health and status',
    requiresAuth: false,
    requiresApiKey: false,
    group: ENDPOINT_GROUPS.HEALTH,
  },

  // Utility Endpoint
  'GET /api/v1/auth/platform-info': {
    path: '/api/v1/auth/platform-info',
    method: 'GET',
    description: 'Get platform information for the current request (for testing)',
    requiresAuth: false,
    requiresApiKey: false,
    group: ENDPOINT_GROUPS.UTILITY,
  },
};

export const getApiEndpointsInfo = (): Record<string, ApiEndpointInfo> => apiEndpoints;

export const logAvailableEndpoints = (loggerInstance: any): void => {
  try {
    const endpoints = getApiEndpointsInfo();
    const endpointList = Object.entries(endpoints).map(([key, info]) => ({
      endpoint: key,
      method: info.method,
      description: info.description,
      group: info.group,
      auth: info.requiresAuth ? 'Required' : 'Optional',
      apiKey: info.requiresApiKey ? 'Required' : 'Bypassed',
    }));

    // Group endpoints by category for logging
    const groupedEndpoints: Record<string, typeof endpointList> = {};
    Object.values(ENDPOINT_GROUPS).forEach(group => {
      groupedEndpoints[group] = endpointList.filter(endpoint => endpoint.group === group);
    });

    loggerInstance.info('📋 API Endpoints Registry Loaded', {
      total: Object.keys(endpoints).length,
      groups: {
        authentication: groupedEndpoints[ENDPOINT_GROUPS.AUTHENTICATION].length,
        biometric: groupedEndpoints[ENDPOINT_GROUPS.BIOMETRIC].length,
        oauth: groupedEndpoints[ENDPOINT_GROUPS.OAUTH].length,
        session: groupedEndpoints[ENDPOINT_GROUPS.SESSION].length,
        twoFactor: groupedEndpoints[ENDPOINT_GROUPS.TWO_FACTOR].length,
        health: groupedEndpoints[ENDPOINT_GROUPS.HEALTH].length,
        utility: groupedEndpoints[ENDPOINT_GROUPS.UTILITY].length,
      },
      publicEndpoints: Object.keys(endpoints).filter(key => !endpoints[key].requiresApiKey).length,
      protectedEndpoints: Object.keys(endpoints).filter(key => endpoints[key].requiresApiKey)
        .length,
      endpointsByGroup: groupedEndpoints,
    });
  } catch (error) {
    loggerInstance.error('Failed to load API endpoints registry', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
  }
};
