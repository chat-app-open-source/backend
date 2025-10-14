import Redis from 'ioredis';
import { envConfig } from './env';
import logger from './logger';

const REDIS_CONFIG = {
  host: envConfig.redisHost,
  port: envConfig.redisPort,
  password: envConfig.redisPassword || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 1,
  lazyConnect: false,
  connectTimeout: 10000,
  commandTimeout: 5000,
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
} as const;

class RedisClient {
  private client: Redis;
  private static instance: RedisClient;
  private isConnected = false;

  private constructor() {
    this.client = new Redis(REDIS_CONFIG);
    this.setupEventListeners();
  }

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('✅ Redis connected successfully', {
        host: envConfig.redisHost,
        port: envConfig.redisPort,
      });
    });

    this.client.on('error', (error: Error) => {
      this.isConnected = false;
      logger.error('❌ Redis connection error', {
        error: error.message,
        host: envConfig.redisHost,
        port: envConfig.redisPort,
      });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('🔌 Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('🔚 Redis connection ended');
    });
  }

  async waitForConnection(timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now();

    while (!this.isConnected && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.isConnected;
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      if (expirySeconds) {
        await this.client.setex(key, expirySeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis set operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis delete operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis increment operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis expire operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis keys operation failed', { pattern, error: (error as Error).message });
      throw error;
    }
  }

  async quit(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
    } catch (error) {
      logger.error('Redis quit operation failed', { error: (error as Error).message });
      throw error;
    }
  }

  // Hash operations for session management
  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client.hset(key, field, value);
    } catch (error) {
      logger.error('Redis hset operation failed', { key, field, error: (error as Error).message });
      throw error;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.hget(key, field);
    } catch (error) {
      logger.error('Redis hget operation failed', { key, field, error: (error as Error).message });
      throw error;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.hgetall(key);
    } catch (error) {
      logger.error('Redis hgetall operation failed', { key, error: (error as Error).message });
      throw error;
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client.hdel(key, field);
    } catch (error) {
      logger.error('Redis hdel operation failed', { key, field, error: (error as Error).message });
      throw error;
    }
  }

  // Health check
  async ping(): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.ping();
    } catch (error) {
      logger.error('Redis ping failed', { error: (error as Error).message });
      throw error;
    }
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const redisClient = RedisClient.getInstance();
