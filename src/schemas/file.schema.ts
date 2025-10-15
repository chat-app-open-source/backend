import { z } from 'zod';

export const uploadFileSchema = z.object({
  conversationId: z.string().optional(),
  folder: z.string().optional(),
});

export const deleteFileSchema = z.object({
  fileId: z.string().min(1),
});

export const getFilesSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  conversationId: z.string().optional(),
});
