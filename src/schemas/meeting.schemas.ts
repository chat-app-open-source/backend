import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  maxParticipants: z.number().min(1).max(1000).optional(),
  settings: z
    .object({
      allowScreenShare: z.boolean().optional(),
      allowRecording: z.boolean().optional(),
      muteOnEntry: z.boolean().optional(),
      waitingRoom: z.boolean().optional(),
      chatEnabled: z.boolean().optional(),
      participantApproval: z.boolean().optional(),
      allowParticipantUnmute: z.boolean().optional(),
      autoRecord: z.boolean().optional(),
    })
    .optional(),
});

export const joinMeetingSchema = z.object({
  roomId: z.string().min(1),
  audioEnabled: z.boolean().optional(),
  videoEnabled: z.boolean().optional(),
});

export const leaveMeetingSchema = z.object({
  roomId: z.string().min(1),
});

export const updateMeetingSettingsSchema = z.object({
  roomId: z.string().min(1),
  settings: z.object({
    allowScreenShare: z.boolean().optional(),
    allowRecording: z.boolean().optional(),
    muteOnEntry: z.boolean().optional(),
    waitingRoom: z.boolean().optional(),
    chatEnabled: z.boolean().optional(),
    participantApproval: z.boolean().optional(),
    allowParticipantUnmute: z.boolean().optional(),
    autoRecord: z.boolean().optional(),
  }),
});

export const updateParticipantSchema = z.object({
  roomId: z.string().min(1),
  userId: z.string().min(1),
  audioEnabled: z.boolean().optional(),
  videoEnabled: z.boolean().optional(),
  screenShared: z.boolean().optional(),
  role: z.enum(['host', 'co-host', 'participant']).optional(),
});

export const muteAllSchema = z.object({
  roomId: z.string().min(1),
});

export const endMeetingSchema = z.object({
  roomId: z.string().min(1),
});

export const cancelMeetingSchema = z.object({
  roomId: z.string().min(1),
});

export const getMeetingsSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});
