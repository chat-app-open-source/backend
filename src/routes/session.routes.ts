import { Router } from 'express';
import { getSessions, terminateOtherSessions, terminateSession } from '../controllers';
import { authenticate, validate } from '../middlewares';
import { terminateOtherSessionsSchema } from '../schemas';

const router = Router();

router.use(authenticate);

router.get('/', getSessions);
router.delete('/:sessionId', terminateSession);
router.post('/terminate-others', validate(terminateOtherSessionsSchema), terminateOtherSessions);

export default router;
