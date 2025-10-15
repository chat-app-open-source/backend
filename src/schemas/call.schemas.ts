import { z } from 'zod';

export const initiateCallSchema = z.object({
  conversationId: z.string().optional(),
  meetingId: z.string().optional(),
  type: z.enum(['audio', 'video']),
  participants: z.array(z.string()).optional(),
  offer: z.object({
    type: z.enum(['offer']),
    sdp: z.string(),
  }),
});

export const acceptCallSchema = z.object({
  callId: z.string().min(1),
  answer: z.object({
    type: z.enum(['answer']),
    sdp: z.string(),
  }),
});

export const rejectCallSchema = z.object({
  callId: z.string().min(1),
  reason: z.string().optional(),
});

export const endCallSchema = z.object({
  callId: z.string().min(1),
});

export const iceCandidateSchema = z.object({
  callId: z.string().min(1),
  candidate: z.object({
    candidate: z.string(),
    sdpMid: z.string().optional(),
    sdpMLineIndex: z.number().optional(),
  }),
});

export const toggleMediaSchema = z.object({
  callId: z.string().min(1),
  enabled: z.boolean(),
});

export const getCallHistorySchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});
