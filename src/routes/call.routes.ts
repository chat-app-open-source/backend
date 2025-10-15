import { Router } from 'express';
import {
  acceptCall,
  endCall,
  getActiveCall,
  getCallHistory,
  initiateCall,
  joinCall,
  leaveCall,
  rejectCall,
  toggleAudio,
  toggleScreenShare,
  toggleVideo,
} from '../controllers';
import { authenticate, validate } from '../middlewares';
import {
  acceptCallSchema,
  endCallSchema,
  getCallHistorySchema,
  iceCandidateSchema,
  initiateCallSchema,
  rejectCallSchema,
  toggleMediaSchema,
} from '../schemas';

const router = Router();

router.use(authenticate);

// Call management
router.post('/initiate', validate(initiateCallSchema), initiateCall);
router.post('/accept', validate(acceptCallSchema), acceptCall);
router.post('/reject', validate(rejectCallSchema), rejectCall);
router.post('/end', validate(endCallSchema), endCall);
router.post('/join', validate(initiateCallSchema), joinCall);
router.post('/leave', validate(endCallSchema), leaveCall);

// Media control
router.post('/audio/toggle', validate(toggleMediaSchema), toggleAudio);
router.post('/video/toggle', validate(toggleMediaSchema), toggleVideo);
router.post('/screenshare/toggle', validate(toggleMediaSchema), toggleScreenShare);

// Call data
router.get('/history', validate(getCallHistorySchema), getCallHistory);
router.get('/active/:callId', getActiveCall);

// ICE candidate (for WebSocket fallback)
router.post('/ice-candidate', validate(iceCandidateSchema), (_req, res) => {
  // This is handled by WebSocket, but provides HTTP fallback
  res.json({ success: true, message: 'ICE candidate received' });
});

export default router;
