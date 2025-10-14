import { Router } from 'express';
import authRoutes from './auth.routes';
import biometricRoutes from './biometric.routes';
import sessionRoutes from './session.routes';
import twoFactorRoutes from './twoFactor.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/biometric', biometricRoutes);
router.use('/2fa', twoFactorRoutes);
router.use('/sessions', sessionRoutes);

export default router;
