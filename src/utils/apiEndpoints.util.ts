/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ApiEndpointInfo {
  path: string;
  method: string;
  description: string;
  requiresAuth?: boolean;
  requiresApiKey?: boolean;
  group: string;
}

// Define endpoint groups
const ENDPOINT_GROUPS = {
  AUTHENTICATION: 'Authentication',
  BIOMETRIC: 'Biometric Authentication',
  OAUTH: 'OAuth',
  SESSION: 'Session Management',
  TWO_FACTOR: 'Two-Factor Authentication',
  CHAT: 'Chat & Messaging',
  CALL: 'Voice/Video Calls',
  MEETING: 'Meetings',
  STORY: 'Stories',
  FILE: 'File Management',
  HEALTH: 'Health Check',
  UTILITY: 'Utility',
} as const;

// Define all API endpoints
const apiEndpoints: Record<string, ApiEndpointInfo> = {
  /** ---------------- AUTHENTICATION ---------------- **/
  'POST /api/v1/auth/register': {
    path: '/api/v1/auth/register',
    method: 'POST',
    description: 'Register a new user account with email and password',
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/verify-email': {
    path: '/api/v1/auth/verify-email',
    method: 'POST',
    description: 'Verify user email with OTP',
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/login': {
    path: '/api/v1/auth/login',
    method: 'POST',
    description: 'User login with email and password',
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/verify-2fa-login': {
    path: '/api/v1/auth/verify-2fa-login',
    method: 'POST',
    description: 'Verify 2FA login code for multi-factor authentication',
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/resend-otp': {
    path: '/api/v1/auth/resend-otp',
    method: 'POST',
    description: 'Resend verification OTP for email verification',
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/refresh-token': {
    path: '/api/v1/auth/refresh-token',
    method: 'POST',
    description: 'Refresh access token using refresh token',
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/forgot-password': {
    path: '/api/v1/auth/forgot-password',
    method: 'POST',
    description: 'Request OTP for password reset',
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/verify-password-reset-otp': {
    path: '/api/v1/auth/verify-password-reset-otp',
    method: 'POST',
    description: 'Verify OTP for password reset',
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.AUTHENTICATION,
  },
  'POST /api/v1/auth/reset-password': {
    path: '/api/v1/auth/reset-password',
    method: 'POST',
    description: 'Reset password after OTP verification',
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
    description: 'Logout from current device/session',
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

  /** ---------------- OAUTH ---------------- **/
  'GET /api/v1/auth/google': {
    path: '/api/v1/auth/google',
    method: 'GET',
    description: 'Initiate Google OAuth flow',
    group: ENDPOINT_GROUPS.OAUTH,
  },
  'GET /api/v1/auth/google/callback': {
    path: '/api/v1/auth/google/callback',
    method: 'GET',
    description: 'Handle Google OAuth callback',
    group: ENDPOINT_GROUPS.OAUTH,
  },
  'GET /api/v1/auth/facebook': {
    path: '/api/v1/auth/facebook',
    method: 'GET',
    description: 'Initiate Facebook OAuth flow',
    group: ENDPOINT_GROUPS.OAUTH,
  },
  'GET /api/v1/auth/facebook/callback': {
    path: '/api/v1/auth/facebook/callback',
    method: 'GET',
    description: 'Handle Facebook OAuth callback',
    group: ENDPOINT_GROUPS.OAUTH,
  },

  /** ---------------- BIOMETRIC ---------------- **/
  'POST /api/v1/biometric/login': {
    path: '/api/v1/biometric/login',
    method: 'POST',
    description: 'Login using biometric authentication',
    requiresApiKey: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'GET /api/v1/biometric/status': {
    path: '/api/v1/biometric/status',
    method: 'GET',
    description: 'Get biometric auth status',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'POST /api/v1/biometric/registration/options': {
    path: '/api/v1/biometric/registration/options',
    method: 'POST',
    description: 'Generate biometric registration options',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'POST /api/v1/biometric/registration/verify': {
    path: '/api/v1/biometric/registration/verify',
    method: 'POST',
    description: 'Verify biometric registration',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },
  'POST /api/v1/biometric/credentials/remove': {
    path: '/api/v1/biometric/credentials/remove',
    method: 'POST',
    description: 'Remove biometric credential',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.BIOMETRIC,
  },

  /** ---------------- CHAT ---------------- **/
  'POST /api/v1/chat/messages/send': {
    path: '/api/v1/chat/messages/send',
    method: 'POST',
    description: 'Send a chat message',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.CHAT,
  },
  'GET /api/v1/chat/conversations': {
    path: '/api/v1/chat/conversations',
    method: 'GET',
    description: 'Get user conversations',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.CHAT,
  },
  'POST /api/v1/chat/encryption/initialize': {
    path: '/api/v1/chat/encryption/initialize',
    method: 'POST',
    description: 'Initialize E2E encryption for chat',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.CHAT,
  },

  /** ---------------- CALLS ---------------- **/
  'POST /api/v1/calls/initiate': {
    path: '/api/v1/calls/initiate',
    method: 'POST',
    description: 'Initiate a call between users',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.CALL,
  },
  'POST /api/v1/calls/accept': {
    path: '/api/v1/calls/accept',
    method: 'POST',
    description: 'Accept incoming call',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.CALL,
  },
  'POST /api/v1/calls/reject': {
    path: '/api/v1/calls/reject',
    method: 'POST',
    description: 'Reject incoming call',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.CALL,
  },
  'POST /api/v1/calls/end': {
    path: '/api/v1/calls/end',
    method: 'POST',
    description: 'End a call',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.CALL,
  },

  /** ---------------- MEETINGS ---------------- **/
  'POST /api/v1/meetings/create': {
    path: '/api/v1/meetings/create',
    method: 'POST',
    description: 'Create a new meeting',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.MEETING,
  },
  'POST /api/v1/meetings/join': {
    path: '/api/v1/meetings/join',
    method: 'POST',
    description: 'Join an existing meeting',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.MEETING,
  },
  'POST /api/v1/meetings/leave': {
    path: '/api/v1/meetings/leave',
    method: 'POST',
    description: 'Leave a meeting',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.MEETING,
  },
  'GET /api/v1/meetings': {
    path: '/api/v1/meetings',
    method: 'GET',
    description: 'Get all meetings for user',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.MEETING,
  },

  /** ---------------- STORIES ---------------- **/
  'POST /api/v1/stories/create': {
    path: '/api/v1/stories/create',
    method: 'POST',
    description: 'Create a new story',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.STORY,
  },
  'POST /api/v1/stories/view': {
    path: '/api/v1/stories/view',
    method: 'POST',
    description: 'View a story',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.STORY,
  },
  'DELETE /api/v1/stories/delete': {
    path: '/api/v1/stories/delete',
    method: 'DELETE',
    description: 'Delete a story',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.STORY,
  },

  /** ---------------- FILES ---------------- **/
  'POST /api/v1/files/upload': {
    path: '/api/v1/files/upload',
    method: 'POST',
    description: 'Upload a file (up to 50MB)',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.FILE,
  },
  'DELETE /api/v1/files/delete': {
    path: '/api/v1/files/delete',
    method: 'DELETE',
    description: 'Delete a user file',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.FILE,
  },
  'GET /api/v1/files/user': {
    path: '/api/v1/files/user',
    method: 'GET',
    description: 'Get all user files',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.FILE,
  },
  'GET /api/v1/files/:fileId': {
    path: '/api/v1/files/:fileId',
    method: 'GET',
    description: 'Get file by ID',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.FILE,
  },

  /** ---------------- 2FA ---------------- **/
  'POST /api/v1/2fa/enable': {
    path: '/api/v1/2fa/enable',
    method: 'POST',
    description: 'Enable 2FA for user',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.TWO_FACTOR,
  },
  'POST /api/v1/2fa/verify': {
    path: '/api/v1/2fa/verify',
    method: 'POST',
    description: 'Verify 2FA token',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.TWO_FACTOR,
  },
  'POST /api/v1/2fa/disable': {
    path: '/api/v1/2fa/disable',
    method: 'POST',
    description: 'Disable 2FA for user',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.TWO_FACTOR,
  },

  /** ---------------- SESSIONS ---------------- **/
  'GET /api/v1/sessions': {
    path: '/api/v1/sessions',
    method: 'GET',
    description: 'Get active sessions',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.SESSION,
  },
  'DELETE /api/v1/sessions/:sessionId': {
    path: '/api/v1/sessions/:sessionId',
    method: 'DELETE',
    description: 'Terminate session by ID',
    requiresAuth: true,
    group: ENDPOINT_GROUPS.SESSION,
  },

  /** ---------------- HEALTH ---------------- **/
  'GET /api/health': {
    path: '/api/health',
    method: 'GET',
    description: 'Check server health',
    group: ENDPOINT_GROUPS.HEALTH,
  },

  /** ---------------- UTILITY ---------------- **/
  'GET /api/v1/auth/platform-info': {
    path: '/api/v1/auth/platform-info',
    method: 'GET',
    description: 'Get platform info (for testing)',
    group: ENDPOINT_GROUPS.UTILITY,
  },
};

// ---------- Export helpers ----------
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
      apiKey: info.requiresApiKey ? 'Required' : 'Optional',
    }));

    // Group by category
    const grouped: Record<string, typeof endpointList> = {};
    Object.values(ENDPOINT_GROUPS).forEach(g => {
      grouped[g] = endpointList.filter(e => e.group === g);
    });

    loggerInstance.info('📋 API Endpoints Registry Loaded', {
      total: Object.keys(endpoints).length,
      groups: Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])),
    });
  } catch (err) {
    loggerInstance.error('Failed to load API endpoints registry', {
      error: (err as Error).message,
    });
  }
};
