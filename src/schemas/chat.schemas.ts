import { z } from 'zod';

export const createConversationSchema = z.object({
  type: z.enum(['direct', 'group', 'channel']),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  participantIds: z.array(z.string()).optional(),
  avatar: z.string().optional(),
  settings: z
    .object({
      allowInvites: z.boolean().optional(),
      allowMedia: z.boolean().optional(),
      allowCalls: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      slowMode: z.number().min(0).max(300).optional(),
      isPublic: z.boolean().optional(),
    })
    .optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  type: z.enum(['text', 'image', 'video', 'audio', 'file', 'location']),
  content: z.string().min(1).max(5000),
  file: z
    .object({
      name: z.string().optional(),
      size: z.number().optional(),
      type: z.string().optional(),
      url: z.string().optional(),
      thumbnailUrl: z.string().optional(),
    })
    .optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
    })
    .optional(),
  replyTo: z.string().optional(),
  mentions: z.array(z.string()).optional(),
});

export const reactToMessageSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(10),
});

export const deleteMessageSchema = z.object({
  messageId: z.string().min(1),
  forEveryone: z.boolean().optional(),
});

export const forwardMessagesSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
  conversationIds: z.array(z.string().min(1)).min(1),
});

export const starMessageSchema = z.object({
  messageId: z.string().min(1),
});

export const markAsReadSchema = z.object({
  messageId: z.string().min(1),
});

export const addParticipantSchema = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
});

export const removeParticipantSchema = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
});

export const updateConversationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().optional(),
  settings: z
    .object({
      allowInvites: z.boolean().optional(),
      allowMedia: z.boolean().optional(),
      allowCalls: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      slowMode: z.number().min(0).max(300).optional(),
      isPublic: z.boolean().optional(),
    })
    .optional(),
});

export const searchMessagesSchema = z.object({
  query: z.string().min(1).max(100),
  conversationId: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const typingSchema = z.object({
  conversationId: z.string().min(1),
});
