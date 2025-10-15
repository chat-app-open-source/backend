/* eslint-disable @typescript-eslint/no-explicit-any */
import type mongoose from 'mongoose';
import { CallData, CallInitiateData } from './call.types';

export interface IMessage {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'system';
  content: string;
  // E2E Encrypted fields
  encryptedContent?: string;
  encryptionMetadata?: {
    algorithm: string;
    nonce: string;
    recipientPublicKeys: Map<string, string>; // userId -> encryptedMessage
  };
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  thumbnailUrl?: string;
  duration?: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  replyTo?: mongoose.Types.ObjectId;
  reactions: Array<{
    userId: mongoose.Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;
  mentions: mongoose.Types.ObjectId[];
  readBy: mongoose.Types.ObjectId[];
  deleted: boolean;
  deletedAt?: Date;
  deletedForEveryone: boolean;
  starredBy: mongoose.Types.ObjectId[];
  forwarded: boolean;
  forwardedFrom?: mongoose.Types.ObjectId;
  messageHash?: string; // For integrity verification
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageDocument extends IMessage, mongoose.Document {
  _id: mongoose.Types.ObjectId;
  isReadBy(userId: string): boolean;
  verifyIntegrity(): Promise<boolean>;
}

export interface IConversation {
  _id: mongoose.Types.ObjectId;
  type: 'direct' | 'group' | 'channel';
  name?: string;
  description?: string;
  avatar?: string;
  participants: Array<{
    userId: mongoose.Types.ObjectId;
    role: 'admin' | 'moderator' | 'member' | 'subscriber';
    joinedAt: Date;
    addedBy?: mongoose.Types.ObjectId;
  }>;
  createdBy: mongoose.Types.ObjectId;
  admins: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  pinnedMessages: mongoose.Types.ObjectId[];
  settings: {
    allowInvites: boolean;
    allowMedia: boolean;
    allowCalls: boolean;
    requireApproval: boolean;
    slowMode: number;
    isPublic: boolean;
    e2eEncryption: boolean;
  };
  encryptionKey?: string; // Group encryption key (encrypted)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationDocument extends IConversation, mongoose.Document {
  _id: mongoose.Types.ObjectId;
  participantCount: number;
  isUserParticipant(userId: string): boolean;
  getUserRole(userId: string): string | null;
  getParticipantPublicKeys(): Promise<Map<string, string>>;
}

export interface IStory {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'image' | 'video' | 'text';
  content: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  backgroundColor?: string;
  textColor?: string;
  views: mongoose.Types.ObjectId[];
  expiresAt: Date;
  // E2E Encryption for stories
  encryptedContent?: string;
  encryptionMetadata?: {
    algorithm: string;
    nonce: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoryDocument extends IStory, mongoose.Document {
  _id: mongoose.Types.ObjectId;
}

export interface TypingUser {
  userId: string;
  userName: string;
  conversationId: string;
  timestamp: Date;
}

export interface OnlineUser {
  userId: string;
  socketId: string;
  lastSeen: Date;
  status: 'online' | 'away' | 'busy';
}

export interface SocketResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface SendMessageData {
  conversationId: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location';
  content: string;
  encryptedContent?: string;
  encryptionMetadata?: {
    algorithm: string;
    nonce: string;
    recipientPublicKeys: Record<string, string>;
  };
  file?: {
    name: string;
    size: number;
    type: string;
    url: string;
    thumbnailUrl?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  replyTo?: string;
  mentions?: string[];
  enableE2E?: boolean;
}

export interface CreateStoryData {
  type: 'image' | 'video' | 'text';
  content: string;
  mediaUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  duration?: number;
  enableE2E?: boolean;
}

// E2E Encryption Types
export interface EncryptionKeys {
  publicKey: string;
  privateKeyEncrypted: string;
  keySalt: string;
}

export interface EncryptedMessagePayload {
  encryptedContent: string;
  encryptionMetadata: {
    algorithm: string;
    nonce: string;
    recipientEncryptedMessages: Record<string, string>;
  };
  messageHash: string;
}

// Socket Events
export interface ServerToClientEvents {
  // Chat Events
  'message:new': (message: IMessageDocument) => void;
  'message:update': (message: IMessageDocument) => void;
  'message:delete': (data: { messageId: string; deletedForEveryone: boolean }) => void;
  'message:read': (data: { messageId: string; readerId: string }) => void;
  'typing:start': (data: TypingUser) => void;
  'typing:stop': (data: { userId: string; conversationId: string }) => void;

  // Call Events
  'call:incoming': (data: CallData) => void;
  'call:accepted': (data: { callId: string; answer: RTCSessionDescriptionInit }) => void;
  'call:rejected': (data: { callId: string; reason: string }) => void;
  'call:ended': (data: { callId: string; reason: string }) => void;
  'call:ice-candidate': (data: { callId: string; candidate: RTCIceCandidateInit }) => void;
  'call:participant-joined': (data: { callId: string; participant: any }) => void;
  'call:participant-left': (data: { callId: string; participantId: string }) => void;
  'call:participant-updated': (data: {
    callId: string;
    participantId: string;
    audioEnabled?: boolean;
    videoEnabled?: boolean;
  }) => void;

  // User Events
  'user:online': (data: OnlineUser) => void;
  'user:offline': (data: { userId: string }) => void;
  'user:status': (data: { userId: string; status: 'online' | 'away' | 'busy' }) => void;

  // Conversation Events
  'conversation:created': (conversation: IConversationDocument) => void;
  'conversation:updated': (conversation: IConversationDocument) => void;
  'conversation:user-added': (data: {
    conversationId: string;
    userId: string;
    addedBy: string;
  }) => void;
  'conversation:user-removed': (data: {
    conversationId: string;
    userId: string;
    removedBy: string;
  }) => void;

  // E2E Encryption Events
  'encryption:keys-exchanged': (data: { userId: string; publicKey: string }) => void;
  'encryption:error': (data: { messageId: string; error: string }) => void;

  // Meeting Events
  'meeting:participant-joined': (data: { meetingId: string; participant: any }) => void;
  'meeting:participant-left': (data: { meetingId: string; participantId: string }) => void;
  'meeting:settings-updated': (data: { meetingId: string; settings: any }) => void;

  // Story Events
  'story:new': (story: IStoryDocument) => void;
  'story:viewed': (data: { storyId: string; viewerId: string }) => void;
}

export interface ClientToServerEvents {
  // Chat Events
  'message:send': (data: SendMessageData, callback: (response: SocketResponse) => void) => void;
  'message:read': (
    data: { messageId: string },
    callback: (response: SocketResponse) => void,
  ) => void;
  'message:react': (
    data: { messageId: string; emoji: string },
    callback: (response: SocketResponse) => void,
  ) => void;
  'message:delete': (
    data: { messageId: string; forEveryone: boolean },
    callback: (response: SocketResponse) => void,
  ) => void;
  'message:star': (
    data: { messageId: string },
    callback: (response: SocketResponse) => void,
  ) => void;
  'message:forward': (
    data: { messageIds: string[]; conversationIds: string[] },
    callback: (response: SocketResponse) => void,
  ) => void;
  'typing:start': (data: { conversationId: string }) => void;
  'typing:stop': (data: { conversationId: string }) => void;

  // E2E Encryption Events
  'encryption:init': (callback: (response: SocketResponse) => void) => void;
  'encryption:exchange-keys': (
    data: { publicKey: string },
    callback: (response: SocketResponse) => void,
  ) => void;

  // Call Events
  'call:initiate': (data: CallInitiateData, callback: (response: SocketResponse) => void) => void;
  'call:accept': (
    data: { callId: string; answer: RTCSessionDescriptionInit },
    callback: (response: SocketResponse) => void,
  ) => void;
  'call:reject': (
    data: { callId: string; reason: string },
    callback: (response: SocketResponse) => void,
  ) => void;
  'call:end': (data: { callId: string }, callback: (response: SocketResponse) => void) => void;
  'call:ice-candidate': (data: { callId: string; candidate: RTCIceCandidateInit }) => void;
  'call:toggle-audio': (data: { callId: string; enabled: boolean }) => void;
  'call:toggle-video': (data: { callId: string; enabled: boolean }) => void;

  // Meeting Events
  'join:meeting': (
    data: { roomId: string; audioEnabled?: boolean; videoEnabled?: boolean },
    callback: (response: SocketResponse) => void,
  ) => void;
  'leave:meeting': (data: { roomId: string }, callback: (response: SocketResponse) => void) => void;
  'meeting:update-settings': (
    data: { roomId: string; settings: any },
    callback: (response: SocketResponse) => void,
  ) => void;

  // Story Events
  'story:create': (data: CreateStoryData, callback: (response: SocketResponse) => void) => void;
  'story:view': (data: { storyId: string }, callback: (response: SocketResponse) => void) => void;

  // Connection Events
  'join:conversation': (data: { conversationId: string }) => void;
  'leave:conversation': (data: { conversationId: string }) => void;
  'join:call': (data: { callId: string }) => void;
  'leave:call': (data: { callId: string }) => void;
}
