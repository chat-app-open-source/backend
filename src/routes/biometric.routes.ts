import { Router } from 'express';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  getBiometricStatus,
  getCredentials,
  removeCredential,
  verifyAuthentication,
  verifyRegistration,
} from '../controllers';
import { authenticate, validate } from '../middlewares';
import {
  authenticationOptionsSchema,
  biometricLoginSchema,
  biometricRegistrationSchema,
  biometricVerificationSchema,
  removeCredentialSchema,
} from '../schemas';

const router = Router();

// Public routes
router.post(
  '/authentication/options',
  validate(authenticationOptionsSchema),
  generateAuthenticationOptions,
);
router.post('/login', validate(biometricLoginSchema), verifyAuthentication);

// Protected routes (require authentication)
router.use(authenticate);

router.get('/status', getBiometricStatus);
router.get('/credentials', getCredentials);
router.post(
  '/registration/options',
  validate(biometricRegistrationSchema),
  generateRegistrationOptions,
);
router.post('/registration/verify', validate(biometricVerificationSchema), verifyRegistration);
router.post('/credentials/remove', validate(removeCredentialSchema), removeCredential);

export default router;
