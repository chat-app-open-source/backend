/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import type { AuthenticatorTransportFuture, Base64URLString } from '@simplewebauthn/types';

import { envConfig } from '../config/env';
import logger from '../config/logger';
import { redisClient } from '../config/redis';
import { User } from '../models';
import type { Credential } from '../types/webauthn.types';

export class WebAuthnService {
  private static readonly CHALLENGE_EXPIRY = 5 * 60; // 5 minutes in seconds

  static async generateRegistrationOptions(
    userId: string,
    deviceName: string,
    deviceType: 'web' | 'android' | 'ios',
  ): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Convert existing credentials to excludeCredentials format
      const excludeCredentials = user.credentials.map(cred => ({
        id: cred.id as Base64URLString,
        type: 'public-key' as const,
        transports: cred.transports as AuthenticatorTransportFuture[],
      }));

      const opts: GenerateRegistrationOptionsOpts = {
        rpName: envConfig.rpName,
        rpID: envConfig.rpId,
        userID: isoUint8Array.fromUTF8String(userId),
        userName: user.email,
        userDisplayName: `${user.firstName} ${user.lastName}`,
        attestationType: envConfig.attestationType as 'none' | 'direct' | 'enterprise',
        excludeCredentials,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: envConfig.userVerification as 'required' | 'preferred' | 'discouraged',
          authenticatorAttachment: 'platform',
        },
        supportedAlgorithmIDs: [-7, -257], // ES256, RS256
        timeout: 60000,
      };

      const options = await generateRegistrationOptions(opts);

      // Store challenge and device info in Redis
      await redisClient.set(
        `webauthn_reg:${userId}`,
        JSON.stringify({
          challenge: options.challenge,
          deviceName,
          deviceType,
          userId,
        }),
        this.CHALLENGE_EXPIRY,
      );

      logger.info('WebAuthn registration options generated', {
        userId,
        deviceType,
        deviceName,
      });

      return options;
    } catch (error) {
      logger.error('WebAuthn registration options generation failed', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  static async verifyRegistration(
    userId: string,
    response: any,
  ): Promise<VerifiedRegistrationResponse> {
    try {
      const sessionData = await redisClient.get(`webauthn_reg:${userId}`);
      if (!sessionData) {
        throw new Error('Registration session expired or not found');
      }

      const { challenge, deviceName, deviceType } = JSON.parse(sessionData);

      // Get the current origin from the request
      const currentOrigin = response.response?.clientDataJSON
        ? this.getOriginFromClientData(response.response.clientDataJSON)
        : envConfig.origin;

      // Validate against expected origins
      const isValidOrigin = this.validateOrigin(currentOrigin);
      if (!isValidOrigin) {
        throw new Error(
          `Invalid domain: ${currentOrigin}. Expected: ${envConfig.expectedOrigins.join(', ')}`,
        );
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: currentOrigin,
        expectedRPID: envConfig.rpId,
        requireUserVerification: envConfig.userVerification === 'required',
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error('Registration verification failed');
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      // Convert Uint8Array to Buffer for MongoDB storage
      const publicKeyBuffer = Buffer.from(credential.publicKey);

      // Create new credential
      const newCredential: Credential = {
        id: credential.id,
        publicKey: publicKeyBuffer as unknown as Uint8Array,
        counter: credential.counter,
        transports: credential.transports,
        deviceType,
        deviceName,
        webauthnUserID: isoBase64URL.fromBuffer(isoUint8Array.fromUTF8String(userId)),
        deviceTypeInternal: credentialDeviceType,
        backedUp: credentialBackedUp,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      // Update user with new credential
      await User.findByIdAndUpdate(
        userId,
        {
          $push: { credentials: newCredential },
          $set: { 'securitySettings.biometricLogin': true },
        },
        { new: true },
      );

      // Clear registration session
      await redisClient.del(`webauthn_reg:${userId}`);

      logger.info('WebAuthn registration verified', {
        userId,
        credentialID: `${credential.id.substring(0, 10)}...`,
        deviceType,
        origin: currentOrigin,
      });

      return verification;
    } catch (error) {
      logger.error('WebAuthn registration verification failed', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Helper function to extract origin from clientDataJSON
  private static getOriginFromClientData(clientDataJSON: string): string {
    try {
      // If clientDataJSON is base64 encoded, decode it first
      let clientData: string;
      try {
        clientData = atob(clientDataJSON);
      } catch {
        // If it's already decoded, use as is
        clientData = clientDataJSON;
      }

      const clientDataObj = JSON.parse(clientData);
      return clientDataObj.origin;
    } catch (error) {
      logger.warn('Failed to extract origin from clientDataJSON, using default', {
        error: (error as Error).message,
      });
      return envConfig.origin;
    }
  }

  private static validateOrigin(origin: string): boolean {
    return envConfig.expectedOrigins.includes(origin);
  }

  static async generateAuthenticationOptions(email: string): Promise<any> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal that user doesn't exist for security
        throw new Error('Authentication failed');
      }

      if (!user.credentials || user.credentials.length === 0) {
        throw new Error('No biometric credentials registered');
      }

      // Convert credentials to allowCredentials format
      const allowCredentials = user.credentials.map(cred => ({
        id: cred.id as Base64URLString,
        type: 'public-key' as const,
        transports: cred.transports as AuthenticatorTransportFuture[],
      }));

      const opts: GenerateAuthenticationOptionsOpts = {
        rpID: envConfig.rpId,
        allowCredentials,
        userVerification: envConfig.userVerification as 'required' | 'preferred' | 'discouraged',
        timeout: 60000,
      };

      const options = await generateAuthenticationOptions(opts);

      // Store challenge in Redis
      await redisClient.set(`webauthn_auth:${user.id}`, options.challenge, this.CHALLENGE_EXPIRY);

      logger.info('WebAuthn authentication options generated', {
        userId: user.id,
        email,
        credentialsCount: allowCredentials.length,
      });

      return options;
    } catch (error) {
      logger.error('WebAuthn authentication options generation failed', {
        email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  static async verifyAuthentication(
    userId: string,
    response: any,
  ): Promise<VerifiedAuthenticationResponse> {
    try {
      const challenge = await redisClient.get(`webauthn_auth:${userId}`);
      if (!challenge) {
        throw new Error('Authentication challenge expired or not found');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const credential = user.credentials.find(cred => cred.id === response.id);
      if (!credential) {
        throw new Error('Credential not found');
      }

      // Get the current origin from the request
      const currentOrigin = response.response?.clientDataJSON
        ? this.getOriginFromClientData(response.response.clientDataJSON)
        : envConfig.origin;

      // Validate against expected origins
      const isValidOrigin = this.validateOrigin(currentOrigin);
      if (!isValidOrigin) {
        throw new Error(
          `Invalid domain: ${currentOrigin}. Expected: ${envConfig.expectedOrigins.join(', ')}`,
        );
      }

      // Convert Buffer back to Uint8Array for verification
      const publicKeyUint8 = new Uint8Array(credential.publicKey as unknown as ArrayBuffer);

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: currentOrigin, // Use the actual origin from the request
        expectedRPID: envConfig.rpId,
        credential: {
          id: credential.id,
          publicKey: publicKeyUint8,
          counter: credential.counter,
          transports: credential.transports as AuthenticatorTransportFuture[],
        },
        requireUserVerification: envConfig.userVerification === 'required',
      });

      if (!verification.verified) {
        throw new Error('Authentication verification failed');
      }

      // Update credential counter and last used
      await User.updateOne(
        { _id: userId, 'credentials.id': response.id },
        {
          $set: {
            'credentials.$.counter': verification.authenticationInfo.newCounter,
            'credentials.$.lastUsed': new Date(),
          },
        },
      );

      // Clear authentication session
      await redisClient.del(`webauthn_auth:${userId}`);

      logger.info('WebAuthn authentication verified', {
        userId,
        credentialID: `${response.id.substring(0, 10)}...`,
        origin: currentOrigin,
      });

      return verification;
    } catch (error) {
      logger.error('WebAuthn authentication verification failed', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  static async removeCredential(userId: string, credentialID: string): Promise<boolean> {
    try {
      const result = await User.updateOne(
        { _id: userId },
        { $pull: { credentials: { id: credentialID } } },
      );

      // If no credentials left, disable biometric login
      const user = await User.findById(userId);
      if (user && (!user.credentials || user.credentials.length === 0)) {
        await User.findByIdAndUpdate(userId, {
          $set: { 'securitySettings.biometricLogin': false },
        });
      }

      logger.info('WebAuthn credential removed', {
        userId,
        credentialID: `${credentialID.substring(0, 10)}...`,
      });

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('WebAuthn credential removal failed', {
        userId,
        credentialID: `${credentialID.substring(0, 10)}...`,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  static async getCredentials(userId: string): Promise<Credential[]> {
    try {
      const user = await User.findById(userId).select('credentials');
      return user?.credentials || [];
    } catch (error) {
      logger.error('Get WebAuthn credentials failed', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  static async isBiometricEnabled(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).select(
        'securitySettings.biometricLogin credentials',
      );
      return !!(user?.securitySettings?.biometricLogin && user.credentials.length > 0);
    } catch (error) {
      logger.error('Check biometric status failed', {
        userId,
        error: (error as Error).message,
      });
      return false;
    }
  }
}
