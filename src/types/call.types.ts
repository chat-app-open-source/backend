import type mongoose from 'mongoose';

export interface ICall {
  _id: mongoose.Types.ObjectId;
  type: 'audio' | 'video';
  participants: Array<{
    userId: mongoose.Types.ObjectId;
    joinedAt: Date;
    leftAt?: Date;
    duration?: number;
    status: 'calling' | 'joined' | 'rejected' | 'missed' | 'busy';
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenShared: boolean;
  }>;
  initiator: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  meetingId?: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration: number;
  status: 'calling' | 'active' | 'ended' | 'rejected' | 'missed';
  callRecordings?: Array<{
    url: string;
    duration: number;
    startedAt: Date;
    endedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICallDocument extends ICall, mongoose.Document {
  _id: mongoose.Types.ObjectId;
}

export interface CallInitiateData {
  conversationId?: string;
  meetingId?: string;
  type: 'audio' | 'video';
  participants?: string[];
  offer: RTCSessionDescriptionInit;
}

export interface CallData {
  callId: string;
  initiator: {
    id: string;
    name: string;
    avatar?: string;
  };
  type: 'audio' | 'video';
  conversationId?: string;
  meetingId?: string;
  offer: RTCSessionDescriptionInit;
}
