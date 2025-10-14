import { Router } from 'express';
import {
  disable2FA,
  enable2FA,
  generateBackupCodes,
  get2FAStatus,
  verify2FA,
} from '../controllers';
import { authenticate, validate } from '../middlewares';
import { verify2FASchema } from '../schemas';

const router = Router();

// Protected routes (require authentication)
router.use(authenticate);

router.get('/status', get2FAStatus);
router.post('/enable', enable2FA);
router.post('/verify', validate(verify2FASchema), verify2FA);
router.post('/disable', disable2FA);
router.post('/backup-codes/generate', generateBackupCodes);

export default router;
