import { Router } from 'express';
import {
  addParticipant,
  addReaction,
  createChannel,
  createConversation,
  createGroup,
  decryptMessage,
  deleteMessage,
  forwardMessages,
  getConversations,
  getMessages,
  initializeEncryption,
  markAsRead,
  removeParticipant,
  rotateEncryptionKeys,
  searchMessages,
  sendMessage,
  starMessage,
  unstarMessage,
} from '../controllers';
import { authenticate, validate } from '../middlewares';
import {
  addParticipantSchema,
  createConversationSchema,
  deleteMessageSchema,
  forwardMessagesSchema,
  markAsReadSchema,
  reactToMessageSchema,
  removeParticipantSchema,
  searchMessagesSchema,
  sendMessageSchema,
  starMessageSchema,
  typingSchema,
} from '../schemas';

const router = Router();

router.use(authenticate);

// Conversation routes
router.post('/conversations/direct', validate(createConversationSchema), createConversation);
router.post('/conversations/group', validate(createConversationSchema), createGroup);
router.post('/conversations/channel', validate(createConversationSchema), createChannel);
router.get('/conversations', getConversations);

// Message routes
router.post('/messages/send', validate(sendMessageSchema), sendMessage);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/messages/read', validate(markAsReadSchema), markAsRead);
router.post('/messages/react', validate(reactToMessageSchema), addReaction);
router.post('/messages/delete', validate(deleteMessageSchema), deleteMessage);
router.post('/messages/star', validate(starMessageSchema), starMessage);
router.delete('/messages/star', validate(starMessageSchema), unstarMessage);
router.post('/messages/forward', validate(forwardMessagesSchema), forwardMessages);
router.post('/messages/search', validate(searchMessagesSchema), searchMessages);

// E2E Encryption routes
router.post('/messages/decrypt', decryptMessage);
router.post('/encryption/initialize', initializeEncryption);
router.post('/encryption/rotate-keys', rotateEncryptionKeys);

// Group management
router.post('/conversations/participants/add', validate(addParticipantSchema), addParticipant);
router.post(
  '/conversations/participants/remove',
  validate(removeParticipantSchema),
  removeParticipant,
);

// Typing indicators (for WebSocket fallback)
router.post('/typing/start', validate(typingSchema), (_req, res) => {
  // This is handled by WebSocket, but provides HTTP fallback
  res.json({ success: true, message: 'Typing started' });
});

router.post('/typing/stop', validate(typingSchema), (_req, res) => {
  // This is handled by WebSocket, but provides HTTP fallback
  res.json({ success: true, message: 'Typing stopped' });
});

export default router;
