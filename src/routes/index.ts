import { Router } from 'express';
import authRoutes from './auth.routes';
import biometricRoutes from './biometric.routes';
import callRoutes from './call.routes';
import chatRoutes from './chat.routes';
import fileRoutes from './file.routes';
import meetingRoutes from './meeting.routes';
import sessionRoutes from './session.routes';
import storyRoutes from './story.routes';
import twoFactorRoutes from './twoFactor.routes';
import userRoutes from './user.routes';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/biometric', biometricRoutes);
router.use('/sessions', sessionRoutes);
router.use('/2fa', twoFactorRoutes);
router.use('/chat', chatRoutes);
router.use('/calls', callRoutes);
router.use('/meetings', meetingRoutes);
router.use('/stories', storyRoutes);
router.use('/files', fileRoutes);
router.use('/users', userRoutes);

export default router;
