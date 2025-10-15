import { Router } from 'express';
import {
  cancelMeeting,
  createMeeting,
  endMeeting,
  getMeeting,
  getMeetings,
  joinMeeting,
  leaveMeeting,
  muteAllParticipants,
  updateMeetingSettings,
  updateParticipant,
} from '../controllers';
import { authenticate, validate } from '../middlewares';
import {
  cancelMeetingSchema,
  createMeetingSchema,
  endMeetingSchema,
  joinMeetingSchema,
  leaveMeetingSchema,
  muteAllSchema,
  updateMeetingSettingsSchema,
  updateParticipantSchema,
} from '../schemas';

const router = Router();

router.use(authenticate);

// Meeting management
router.post('/create', validate(createMeetingSchema), createMeeting);
router.post('/join', validate(joinMeetingSchema), joinMeeting);
router.post('/leave', validate(leaveMeetingSchema), leaveMeeting);
router.post('/end', validate(endMeetingSchema), endMeeting);
router.post('/cancel', validate(cancelMeetingSchema), cancelMeeting);

// Meeting settings
router.post('/settings/update', validate(updateMeetingSettingsSchema), updateMeetingSettings);
router.post('/participants/update', validate(updateParticipantSchema), updateParticipant);
router.post('/participants/mute-all', validate(muteAllSchema), muteAllParticipants);

// Meeting data
router.get('/', validate(createMeetingSchema), getMeetings);
router.get('/:roomId', getMeeting);

export default router;
