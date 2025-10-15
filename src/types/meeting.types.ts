import type mongoose from 'mongoose';

export interface IMeeting {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  host: mongoose.Types.ObjectId;
  coHosts: mongoose.Types.ObjectId[];
  participants: Array<{
    userId: mongoose.Types.ObjectId;
    role: 'host' | 'co-host' | 'participant';
    joinedAt: Date;
    leftAt?: Date;
    duration: number;
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenShared: boolean;
  }>;
  roomId: string;
  startTime: Date;
  endTime?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  maxParticipants: number;
  settings: {
    allowScreenShare: boolean;
    allowRecording: boolean;
    muteOnEntry: boolean;
    waitingRoom: boolean;
    chatEnabled: boolean;
    participantApproval: boolean;
    allowParticipantUnmute: boolean;
    autoRecord: boolean;
  };
  recordings: Array<{
    url: string;
    duration: number;
    startedAt: Date;
    endedAt: Date;
    fileSize: number;
  }>;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface IMeetingDocument extends IMeeting, mongoose.Document {
  _id: mongoose.Types.ObjectId;
}

export interface MeetingCreateData {
  title: string;
  description?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  maxParticipants?: number;
  settings?: Partial<IMeeting['settings']>;
}
