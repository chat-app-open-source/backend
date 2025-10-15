import { Router } from 'express';
import multer from 'multer';
import {
  deleteFile,
  getConversationFiles,
  getFile,
  getUserFiles,
  uploadFile,
} from '../controllers';
import { authenticate, validate } from '../middlewares';
import { deleteFileSchema, getFilesSchema, uploadFileSchema } from '../schemas';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

router.use(authenticate);

// File management
router.post('/upload', upload.single('file'), validate(uploadFileSchema), uploadFile);
router.delete('/delete', validate(deleteFileSchema), deleteFile);

// File retrieval
router.get('/user', validate(getFilesSchema), getUserFiles);
router.get('/conversation/:conversationId', validate(getFilesSchema), getConversationFiles);
router.get('/:fileId', getFile);

export default router;
