import { Router } from 'express';
import { createStory, deleteStory, getStories, viewStory } from '../controllers';
import { authenticate, validate } from '../middlewares';
import { createStorySchema, deleteStorySchema, viewStorySchema } from '../schemas';

const router = Router();

router.use(authenticate);

// Story management
router.post('/create', validate(createStorySchema), createStory);
router.post('/view', validate(viewStorySchema), viewStory);
router.delete('/delete', validate(deleteStorySchema), deleteStory);
router.get('/', getStories);

export default router;
