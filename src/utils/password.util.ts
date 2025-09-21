import bcrypt from 'bcryptjs';
import { logger } from '../config';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    logger.error('Password hashing failed', { error: (error as Error).message });
    throw new Error('Failed to hash password');
  }
};

export const comparePassword = async (
  candidatePassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  try {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  } catch (error) {
    logger.error('Password comparison failed', { error: (error as Error).message });
    return false;
  }
};
