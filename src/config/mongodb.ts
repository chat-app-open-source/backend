import mongoose from 'mongoose';
import logger from './logger';

const MONGO_URI = process.env.MONGO_URI || '';
const MONGODB_LOCAL_URI = process.env.MONGODB_LOCAL_URI || '';

export const connectDB = async (): Promise<void> => {
  const useLocalDB = process.env.USE_LOCAL_DB === 'true';
  const uriToUse = useLocalDB ? MONGODB_LOCAL_URI : MONGO_URI;
  if (!uriToUse) {
    logger.error('❌ No MongoDB URI provided (MONGO_URI or MONGODB_LOCAL_URI)');
    process.exit(1);
  }

  try {
    await mongoose.connect(uriToUse, {
      autoIndex: true,
    });
    logger.info(
      `✅ MongoDB connected successfully to ${useLocalDB ? 'local' : 'remote'} DB at ${uriToUse}`,
    );
  } catch (error) {
    logger.error('❌ MongoDB connection failed', { error });
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});
