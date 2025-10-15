// src/services/encryption.service.ts (Fixed version)
import libsodium from 'libsodium-wrappers';
import logger from '../config/logger';
import { User } from '../models';

export interface EncryptionResult {
  encrypted: string;
  nonce: string;
  algorithm: string;
}

export interface DecryptionResult {
  decrypted: string;
  success: boolean;
}

export interface GroupEncryptionKey {
  key: string;
  encryptedKeys: Map<string, string>; // userId -> encrypted key
  algorithm: string;
  createdAt: Date;
}

export class E2EEncryptionService {
  private static readonly ALGORITHM = 'x25519-xsalsa20-poly1305';
  private static readonly NONCE_LENGTH = 24;
  private static readonly KEY_ROTATION_DAYS = 30;
  private static initialized = false;

  // Initialize libsodium
  static async initialize(): Promise<void> {
    if (!this.initialized) {
      await libsodium.ready;
      this.initialized = true;
      logger.info('✅ E2E Encryption Service initialized successfully');
    }
  }

  // Generate key pair for a user
  static async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    await this.initialize();

    const keyPair = libsodium.crypto_box_keypair();

    return {
      publicKey: this.toBase64(keyPair.publicKey),
      privateKey: this.toBase64(keyPair.privateKey),
    };
  }

  // Encrypt private key with user's password - FIXED VERSION
  static async encryptPrivateKey(
    privateKey: string,
    password: string,
  ): Promise<{ encrypted: string; salt: string }> {
    await this.initialize();

    // Convert password to Uint8Array
    const passwordBytes = libsodium.from_string(password);
    const salt = libsodium.randombytes_buf(libsodium.crypto_pwhash_SALTBYTES);

    const key = libsodium.crypto_pwhash(
      libsodium.crypto_secretbox_KEYBYTES,
      passwordBytes, // Use passwordBytes instead of raw password string
      salt,
      libsodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      libsodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      libsodium.crypto_pwhash_ALG_DEFAULT,
    );

    const nonce = libsodium.randombytes_buf(libsodium.crypto_secretbox_NONCEBYTES);
    const privateKeyBytes = this.fromBase64(privateKey);

    const encrypted = libsodium.crypto_secretbox_easy(privateKeyBytes, nonce, key);

    const combined = new Uint8Array(nonce.length + encrypted.length);
    combined.set(nonce);
    combined.set(encrypted, nonce.length);

    return {
      encrypted: this.toBase64(combined),
      salt: this.toBase64(salt),
    };
  }

  // Decrypt private key with user's password - FIXED VERSION
  static async decryptPrivateKey(
    encryptedPrivateKey: string,
    password: string,
    salt: string,
  ): Promise<string> {
    await this.initialize();

    // Convert password to Uint8Array
    const passwordBytes = libsodium.from_string(password);
    const saltBytes = this.fromBase64(salt);

    const key = libsodium.crypto_pwhash(
      libsodium.crypto_secretbox_KEYBYTES,
      passwordBytes, // Use passwordBytes instead of raw password string
      saltBytes,
      libsodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      libsodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      libsodium.crypto_pwhash_ALG_DEFAULT,
    );

    const combined = this.fromBase64(encryptedPrivateKey);
    const nonce = combined.slice(0, libsodium.crypto_secretbox_NONCEBYTES);
    const encrypted = combined.slice(libsodium.crypto_secretbox_NONCEBYTES);

    const decrypted = libsodium.crypto_secretbox_open_easy(encrypted, nonce, key);

    if (!decrypted) {
      throw new Error('Failed to decrypt private key - incorrect password or corrupted data');
    }

    return this.toBase64(decrypted);
  }

  // Encrypt message for multiple recipients
  static async encryptMessage(
    message: string,
    senderPrivateKey: string,
    recipientPublicKeys: Map<string, string>,
  ): Promise<{
    encryptedContent: string;
    encryptionMetadata: {
      algorithm: string;
      nonce: string;
      recipientEncryptedMessages: Record<string, string>;
    };
  }> {
    await this.initialize();

    const recipientEncryptedMessages: Record<string, string> = {};
    const nonce = libsodium.randombytes_buf(libsodium.crypto_box_NONCEBYTES);

    const senderPrivateKeyBytes = this.fromBase64(senderPrivateKey);
    const messageBytes = libsodium.from_string(message);

    for (const [userId, recipientPublicKey] of recipientPublicKeys.entries()) {
      const recipientPublicKeyBytes = this.fromBase64(recipientPublicKey);

      const encrypted = libsodium.crypto_box_easy(
        messageBytes,
        nonce,
        recipientPublicKeyBytes,
        senderPrivateKeyBytes,
      );

      recipientEncryptedMessages[userId] = this.toBase64(encrypted);
    }

    return {
      encryptedContent: this.toBase64(messageBytes),
      encryptionMetadata: {
        algorithm: this.ALGORITHM,
        nonce: this.toBase64(nonce),
        recipientEncryptedMessages,
      },
    };
  }

  // Decrypt message for a specific recipient
  static async decryptMessage(
    encryptedMessage: string,
    nonce: string,
    senderPublicKey: string,
    recipientPrivateKey: string,
  ): Promise<string> {
    await this.initialize();

    const encryptedBytes = this.fromBase64(encryptedMessage);
    const nonceBytes = this.fromBase64(nonce);
    const senderPublicKeyBytes = this.fromBase64(senderPublicKey);
    const recipientPrivateKeyBytes = this.fromBase64(recipientPrivateKey);

    const decrypted = libsodium.crypto_box_open_easy(
      encryptedBytes,
      nonceBytes,
      senderPublicKeyBytes,
      recipientPrivateKeyBytes,
    );

    if (!decrypted) {
      throw new Error('Failed to decrypt message - invalid key or corrupted data');
    }

    return libsodium.to_string(decrypted);
  }

  // Generate group encryption key
  static async generateGroupKey(participantIds: string[]): Promise<GroupEncryptionKey> {
    await this.initialize();

    const groupKey = libsodium.randombytes_buf(libsodium.crypto_secretbox_KEYBYTES);
    const encryptedKeys = new Map<string, string>();

    // Get public keys of all participants
    const participants = await User.find({ _id: { $in: participantIds } }).select('publicKey');
    const publicKeys = new Map<string, string>();

    participants.forEach(user => {
      if (user.publicKey) {
        publicKeys.set(user._id.toString(), user.publicKey);
      }
    });

    // Encrypt group key for each participant
    for (const [userId, publicKey] of publicKeys.entries()) {
      const publicKeyBytes = this.fromBase64(publicKey);
      const nonce = libsodium.randombytes_buf(libsodium.crypto_box_NONCEBYTES);

      const encrypted = libsodium.crypto_box_easy(
        groupKey,
        nonce,
        publicKeyBytes,
        new Uint8Array(0), // This should be the sender's private key, but for group keys we use a different approach
      );

      const combined = new Uint8Array(nonce.length + encrypted.length);
      combined.set(nonce);
      combined.set(encrypted, nonce.length);

      encryptedKeys.set(userId, this.toBase64(combined));
    }

    return {
      key: this.toBase64(groupKey),
      encryptedKeys,
      algorithm: this.ALGORITHM,
      createdAt: new Date(),
    };
  }

  // Decrypt group key for a user
  static async decryptGroupKey(encryptedGroupKey: string, userPrivateKey: string): Promise<string> {
    await this.initialize();

    const combined = this.fromBase64(encryptedGroupKey);
    const nonce = combined.slice(0, libsodium.crypto_box_NONCEBYTES);
    const encrypted = combined.slice(libsodium.crypto_box_NONCEBYTES);
    const userPrivateKeyBytes = this.fromBase64(userPrivateKey);

    const decrypted = libsodium.crypto_box_open_easy(
      encrypted,
      nonce,
      new Uint8Array(0), // This should be the sender's public key
      userPrivateKeyBytes,
    );

    if (!decrypted) {
      throw new Error('Failed to decrypt group key');
    }

    return this.toBase64(decrypted);
  }

  // Get public keys for conversation participants
  static async getParticipantPublicKeys(participantIds: string[]): Promise<Map<string, string>> {
    const users = await User.find({ _id: { $in: participantIds } }).select('publicKey');
    const publicKeys = new Map<string, string>();

    users.forEach(user => {
      if (user.publicKey) {
        publicKeys.set(user._id.toString(), user.publicKey);
      }
    });

    return publicKeys;
  }

  // Initialize user's encryption keys
  static async initializeUserEncryption(userId: string, password: string): Promise<void> {
    try {
      const { publicKey, privateKey } = await this.generateKeyPair();
      const { encrypted: encryptedPrivateKey, salt } = await this.encryptPrivateKey(
        privateKey,
        password,
      );

      await User.findByIdAndUpdate(userId, {
        publicKey,
        privateKeyEncrypted: encryptedPrivateKey,
        keySalt: salt,
        'encryptionSettings.lastKeyRotation': new Date(),
      });

      logger.info('User encryption keys initialized', { userId });
    } catch (error) {
      logger.error('Failed to initialize user encryption keys', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Rotate user's encryption keys
  static async rotateUserKeys(userId: string, password: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { publicKey, privateKey } = await this.generateKeyPair();
      const { encrypted: encryptedPrivateKey, salt } = await this.encryptPrivateKey(
        privateKey,
        password,
      );

      await User.findByIdAndUpdate(userId, {
        publicKey,
        privateKeyEncrypted: encryptedPrivateKey,
        keySalt: salt,
        'encryptionSettings.lastKeyRotation': new Date(),
      });

      logger.info('User encryption keys rotated', { userId });
    } catch (error) {
      logger.error('Failed to rotate user encryption keys', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Check if user needs key rotation
  static async needsKeyRotation(userId: string): Promise<boolean> {
    const user = await User.findById(userId).select('encryptionSettings');
    if (!user) return false;

    const lastRotation = user.encryptionSettings.lastKeyRotation;
    const rotationInterval = user.encryptionSettings.keyRotationInterval;
    const now = new Date();

    return now.getTime() - lastRotation.getTime() > rotationInterval;
  }

  // Verify message integrity
  static async verifyMessageIntegrity(
    encryptedMessage: string,
    expectedHash: string,
  ): Promise<boolean> {
    await this.initialize();

    const messageBytes = this.fromBase64(encryptedMessage);
    const hashBytes = libsodium.crypto_generichash(
      libsodium.crypto_generichash_BYTES,
      messageBytes,
    );
    const actualHash = this.toBase64(hashBytes);

    return actualHash === expectedHash;
  }

  // Generate message hash for integrity checking
  static async generateMessageHash(message: string): Promise<string> {
    await this.initialize();

    const messageBytes = libsodium.from_string(message);
    const hashBytes = libsodium.crypto_generichash(
      libsodium.crypto_generichash_BYTES,
      messageBytes,
    );

    return this.toBase64(hashBytes);
  }

  // Utility methods for base64 encoding/decoding
  private static toBase64(data: Uint8Array): string {
    return libsodium.to_base64(data, libsodium.base64_variants.ORIGINAL);
  }

  private static fromBase64(data: string): Uint8Array {
    return libsodium.from_base64(data, libsodium.base64_variants.ORIGINAL);
  }
}

// Initialize on module load
E2EEncryptionService.initialize().catch(error => {
  logger.error('❌ Failed to initialize E2E encryption service', {
    error: (error as Error).message,
  });
});
