import admin from 'firebase-admin';
import { envConfig } from './env';
import logger from './logger';

let firebaseApp: admin.app.App;

export const initializeFirebase = (): void => {
  try {
    if (admin.apps.length === 0) {
      const privateKey = envConfig.firebasePrivateKey?.replace(/\\n/g, '\n');

      if (!privateKey || !envConfig.firebaseProjectId || !envConfig.firebaseClientEmail) {
        logger.warn('Firebase configuration missing. File upload and push notifications disabled.');
        return;
      }

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: envConfig.firebaseProjectId,
          clientEmail: envConfig.firebaseClientEmail,
          privateKey,
        }),
        storageBucket: envConfig.storageBucket,
      });

      logger.info('Firebase initialized successfully');
    } else {
      firebaseApp = admin.apps[0] as admin.app.App;
    }
  } catch (error) {
    logger.error('Firebase initialization failed', { error: (error as Error).message });
  }
};

export const getFirebaseApp = (): admin.app.App | null => firebaseApp || null;

export const getFirebaseStorage = (): admin.storage.Storage | null => {
  const app = getFirebaseApp();
  return app ? app.storage() : null;
};

export const getFirebaseMessaging = (): admin.messaging.Messaging | null => {
  const app = getFirebaseApp();
  return app ? app.messaging() : null;
};
