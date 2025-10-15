import { z } from 'zod';

export const createStorySchema = z.object({
  type: z.enum(['image', 'video', 'text']),
  content: z.string().min(1).max(1000),
  mediaUrl: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  duration: z.number().min(1).max(60).optional(),
});

export const viewStorySchema = z.object({
  storyId: z.string().min(1),
});

export const deleteStorySchema = z.object({
  storyId: z.string().min(1),
});
