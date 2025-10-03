import { Router } from 'express';

import { validateAPIKey } from '../middlewares';

import authRoutes from './auth.routes';

const router = Router();

// Apply API key validation to all auth routes
router.use('/auth', validateAPIKey, authRoutes);

export default router;
