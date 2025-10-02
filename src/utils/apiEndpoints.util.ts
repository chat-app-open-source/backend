/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ApiEndpointInfo {
  path: string;
  method: string;
  description: string;
  requiresAuth?: boolean;
  requiresApiKey?: boolean;
}

export const getApiEndpointsInfo = (): Record<string, ApiEndpointInfo> => ({
  // Auth Endpoints
  'POST /api/v1/auth/register': {
    path: '/api/v1/auth/register',
    method: 'POST',
    description: 'Register a new user account',
    requiresAuth: false,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/verify-email': {
    path: '/api/v1/auth/verify-email',
    method: 'POST',
    description: 'Verify user email with OTP',
    requiresAuth: false,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/login': {
    path: '/api/v1/auth/login',
    method: 'POST',
    description: 'User login with email and password',
    requiresAuth: false,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/resend-otp': {
    path: '/api/v1/auth/resend-otp',
    method: 'POST',
    description: 'Resend verification OTP',
    requiresAuth: false,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/refresh-token': {
    path: '/api/v1/auth/refresh-token',
    method: 'POST',
    description: 'Refresh access token with refresh token',
    requiresAuth: false,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/forgot-password': {
    path: '/api/v1/auth/forgot-password',
    method: 'POST',
    description: 'Request password reset OTP',
    requiresAuth: false,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/verify-password-reset-otp': {
    path: '/api/v1/auth/verify-password-reset-otp',
    method: 'POST',
    description: 'Verify password reset OTP',
    requiresAuth: false,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/reset-password': {
    path: '/api/v1/auth/reset-password',
    method: 'POST',
    description: 'Reset password with new password',
    requiresAuth: false,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/change-password': {
    path: '/api/v1/auth/change-password',
    method: 'POST',
    description: 'Change current user password',
    requiresAuth: true,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/logout': {
    path: '/api/v1/auth/logout',
    method: 'POST',
    description: 'Logout current device/session',
    requiresAuth: true,
    requiresApiKey: true,
  },
  'POST /api/v1/auth/logout-all': {
    path: '/api/v1/auth/logout-all',
    method: 'POST',
    description: 'Logout from all devices/sessions',
    requiresAuth: true,
    requiresApiKey: true,
  },

  // OAuth Endpoints
  'GET /api/v1/auth/google': {
    path: '/api/v1/auth/google',
    method: 'GET',
    description: 'Initiate Google OAuth login',
    requiresAuth: false,
    requiresApiKey: false,
  },
  'GET /api/v1/auth/google/callback': {
    path: '/api/v1/auth/google/callback',
    method: 'GET',
    description: 'Google OAuth callback handler',
    requiresAuth: false,
    requiresApiKey: false,
  },
  'GET /api/v1/auth/facebook': {
    path: '/api/v1/auth/facebook',
    method: 'GET',
    description: 'Initiate Facebook OAuth login',
    requiresAuth: false,
    requiresApiKey: false,
  },
  'GET /api/v1/auth/facebook/callback': {
    path: '/api/v1/auth/facebook/callback',
    method: 'GET',
    description: 'Facebook OAuth callback handler',
    requiresAuth: false,
    requiresApiKey: false,
  },

  // Health Check
  'GET /api/health': {
    path: '/api/health',
    method: 'GET',
    description: 'Server health check endpoint',
    requiresAuth: false,
    requiresApiKey: false,
  },
});

export const logAvailableEndpoints = (loggerInstance: any): void => {
  try {
    const endpoints = getApiEndpointsInfo();
    const endpointList = Object.entries(endpoints).map(([key, info]) => ({
      endpoint: key,
      method: info.method,
      description: info.description,
      auth: info.requiresAuth ? 'Required' : 'Optional',
      apiKey: info.requiresApiKey ? 'Required' : 'Bypassed',
    }));

    loggerInstance.info('📋 API Endpoints Registry Loaded', {
      total: Object.keys(endpoints).length,
      authEndpoints: Object.keys(endpoints).filter(key => key.includes('/auth')).length,
      oauthEndpoints: Object.keys(endpoints).filter(
        key => key.includes('oauth') || key.includes('google') || key.includes('facebook'),
      ).length,
      publicEndpoints: Object.keys(endpoints).filter(key => !endpoints[key].requiresApiKey).length,
      protectedEndpoints: Object.keys(endpoints).filter(key => endpoints[key].requiresApiKey)
        .length,
      endpoints: endpointList,
    });
  } catch (error) {
    loggerInstance.error('Failed to load API endpoints registry', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
  }
};
