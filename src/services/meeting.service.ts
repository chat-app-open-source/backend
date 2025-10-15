/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import logger from '../config/logger';
import { Meeting } from '../models';
import type { IMeeting, IMeetingDocument } from '../types';

export class MeetingService {
  // Create a meeting
  static async createMeeting(
    hostId: string,
    data: {
      title: string;
      description?: string;
      scheduledStart?: Date;
      scheduledEnd?: Date;
      maxParticipants?: number;
      settings?: any;
    },
  ): Promise<IMeetingDocument> {
    try {
      const meeting = new Meeting({
        title: data.title,
        description: data.description,
        host: new mongoose.Types.ObjectId(hostId),
        participants: [
          {
            userId: new mongoose.Types.ObjectId(hostId),
            role: 'host',
            joinedAt: new Date(),
            audioEnabled: true,
            videoEnabled: true,
          },
        ],
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        maxParticipants: data.maxParticipants || 100,
        settings: {
          allowScreenShare: data.settings?.allowScreenShare ?? true,
          allowRecording: data.settings?.allowRecording ?? true,
          muteOnEntry: data.settings?.muteOnEntry ?? false,
          waitingRoom: data.settings?.waitingRoom ?? false,
          chatEnabled: data.settings?.chatEnabled ?? true,
          participantApproval: data.settings?.participantApproval ?? false,
          allowParticipantUnmute: data.settings?.allowParticipantUnmute ?? true,
          autoRecord: data.settings?.autoRecord ?? false,
        },
        status: data.scheduledStart && data.scheduledStart > new Date() ? 'scheduled' : 'live',
      });

      await meeting.save();

      // Populate meeting data
      await meeting.populate('host', 'username firstName lastName profilePicture');
      await meeting.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('Meeting created', {
        meetingId: meeting._id,
        hostId,
        roomId: meeting.roomId,
        status: meeting.status,
      });

      return meeting;
    } catch (error) {
      logger.error('Failed to create meeting', {
        hostId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Join a meeting
  static async joinMeeting(
    roomId: string,
    userId: string,
    options: { audioEnabled?: boolean; videoEnabled?: boolean } = {},
  ): Promise<IMeetingDocument> {
    try {
      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Check if meeting is active
      if (meeting.status !== 'live' && meeting.status !== 'scheduled') {
        throw new Error('Meeting is not active');
      }

      // Check participant limit
      const activeParticipants = meeting.participants.filter(p => !p.leftAt);
      if (activeParticipants.length >= meeting.maxParticipants) {
        throw new Error('Meeting has reached maximum participant limit');
      }

      // Check if user is already in meeting
      const existingParticipant = meeting.participants.find(
        p => p.userId.toString() === userId && !p.leftAt,
      );

      if (existingParticipant) {
        // Update participant status
        existingParticipant.joinedAt = new Date();
        existingParticipant.audioEnabled = options.audioEnabled ?? true;
        existingParticipant.videoEnabled = options.videoEnabled ?? true;
      } else {
        // Add new participant
        meeting.participants.push({
          userId: new mongoose.Types.ObjectId(userId),
          role: 'participant',
          joinedAt: new Date(),
          audioEnabled: options.audioEnabled ?? true,
          videoEnabled: options.videoEnabled ?? true,
          screenShared: false,
          duration: 0,
        });
      }

      // Update meeting status if it was scheduled
      if (meeting.status === 'scheduled') {
        meeting.status = 'live';
        meeting.startTime = new Date();
      }

      await meeting.save();

      // Populate meeting data
      await meeting.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('User joined meeting', {
        meetingId: meeting._id,
        roomId,
        userId,
      });

      return meeting;
    } catch (error) {
      logger.error('Failed to join meeting', {
        roomId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Leave a meeting
  static async leaveMeeting(roomId: string, userId: string): Promise<IMeetingDocument> {
    try {
      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const participant = meeting.participants.find(
        p => p.userId.toString() === userId && !p.leftAt,
      );

      if (participant) {
        participant.leftAt = new Date();
        if (participant.joinedAt) {
          participant.duration = Math.floor(
            (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000,
          );
        }

        // If host leaves, assign new host or end meeting
        if (participant.role === 'host') {
          const otherParticipants = meeting.participants.filter(
            p => p.userId.toString() !== userId && !p.leftAt,
          );

          if (otherParticipants.length > 0) {
            // Assign first co-host or participant as new host
            const newHost =
              otherParticipants.find(p => p.role === 'co-host') || otherParticipants[0];
            newHost.role = 'host';
            meeting.host = newHost.userId;
          } else {
            // No participants left, end meeting
            meeting.status = 'ended';
            meeting.endTime = new Date();
          }
        }

        // Check if meeting should end (no participants left)
        const activeParticipants = meeting.participants.filter(p => !p.leftAt);
        if (activeParticipants.length === 0) {
          meeting.status = 'ended';
          meeting.endTime = new Date();
        }

        await meeting.save();

        // Populate meeting data
        await meeting.populate('participants.userId', 'username firstName lastName profilePicture');

        logger.info('User left meeting', {
          meetingId: meeting._id,
          roomId,
          userId,
          duration: participant.duration,
        });
      }

      return meeting;
    } catch (error) {
      logger.error('Failed to leave meeting', {
        roomId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Update participant settings
  static async updateParticipantSettings(
    roomId: string,
    userId: string,
    updates: {
      audioEnabled?: boolean;
      videoEnabled?: boolean;
      screenShared?: boolean;
      role?: 'host' | 'co-host' | 'participant';
    },
  ): Promise<IMeetingDocument> {
    try {
      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const participant = meeting.participants.find(
        p => p.userId.toString() === userId && !p.leftAt,
      );

      if (!participant) {
        throw new Error('Participant not found in meeting');
      }

      // Check permissions for role changes
      if (updates.role && updates.role !== participant.role) {
        const currentUser = meeting.participants.find(p => p.userId.toString() === userId);

        if (currentUser?.role !== 'host') {
          throw new Error('Only host can change participant roles');
        }

        if (updates.role === 'host') {
          // Transfer host role
          meeting.host = participant.userId;
          currentUser.role = 'co-host';
        }

        participant.role = updates.role;
      }

      if (updates.audioEnabled !== undefined) {
        participant.audioEnabled = updates.audioEnabled;
      }

      if (updates.videoEnabled !== undefined) {
        participant.videoEnabled = updates.videoEnabled;
      }

      if (updates.screenShared !== undefined) {
        participant.screenShared = updates.screenShared;
      }

      await meeting.save();

      // Populate meeting data
      await meeting.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.debug('Participant settings updated', {
        roomId,
        userId,
        updates,
      });

      return meeting;
    } catch (error) {
      logger.error('Failed to update participant settings', {
        roomId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Mute all participants
  static async muteAllParticipants(roomId: string, hostId: string): Promise<IMeetingDocument> {
    try {
      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Check if user is host
      const host = meeting.participants.find(
        p => p.userId.toString() === hostId && p.role === 'host',
      );

      if (!host) {
        throw new Error('Only host can mute all participants');
      }

      // Mute all participants except host
      meeting.participants.forEach(participant => {
        if (participant.userId.toString() !== hostId && !participant.leftAt) {
          participant.audioEnabled = false;
        }
      });

      await meeting.save();

      await meeting.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('All participants muted', {
        meetingId: meeting._id,
        roomId,
        hostId,
      });

      return meeting;
    } catch (error) {
      logger.error('Failed to mute all participants', {
        roomId,
        hostId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Add meeting recording
  static async addMeetingRecording(
    roomId: string,
    recordingData: {
      url: string;
      duration: number;
      startedAt: Date;
      endedAt: Date;
      fileSize: number;
    },
  ): Promise<IMeetingDocument> {
    try {
      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (!meeting.settings.allowRecording) {
        throw new Error('Recording is not allowed for this meeting');
      }

      meeting.recordings.push(recordingData);
      await meeting.save();

      logger.info('Meeting recording added', {
        meetingId: meeting._id,
        roomId,
        duration: recordingData.duration,
        fileSize: recordingData.fileSize,
      });

      return meeting;
    } catch (error) {
      logger.error('Failed to add meeting recording', {
        roomId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Get user meetings
  static async getUserMeetings(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    meetings: IMeetingDocument[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [meetings, total] = await Promise.all([
        Meeting.find({
          $or: [
            { host: new mongoose.Types.ObjectId(userId) },
            { 'participants.userId': new mongoose.Types.ObjectId(userId) },
          ],
        })
          .populate('host', 'username firstName lastName profilePicture')
          .populate('participants.userId', 'username firstName lastName profilePicture')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Meeting.countDocuments({
          $or: [
            { host: new mongoose.Types.ObjectId(userId) },
            { 'participants.userId': new mongoose.Types.ObjectId(userId) },
          ],
        }),
      ]);

      return {
        meetings,
        total,
        hasMore: skip + meetings.length < total,
      };
    } catch (error) {
      logger.error('Failed to get user meetings', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Get meeting by room ID
  static async getMeetingByRoomId(roomId: string): Promise<IMeetingDocument | null> {
    try {
      const meeting = await Meeting.findOne({ roomId })
        .populate('host', 'username firstName lastName profilePicture')
        .populate('participants.userId', 'username firstName lastName profilePicture');

      return meeting;
    } catch (error) {
      logger.error('Failed to get meeting by room ID', {
        roomId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Update meeting settings
  static async updateMeetingSettings(
    roomId: string,
    hostId: string,
    settings: Partial<IMeeting['settings']>,
  ): Promise<IMeetingDocument> {
    try {
      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.host.toString() !== hostId) {
        throw new Error('Only host can update meeting settings');
      }

      meeting.settings = {
        ...meeting.settings,
        ...settings,
      };

      await meeting.save();

      logger.info('Meeting settings updated', {
        meetingId: meeting._id,
        roomId,
        hostId,
        settings,
      });

      return meeting;
    } catch (error) {
      logger.error('Failed to update meeting settings', {
        roomId,
        hostId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // End meeting
  static async endMeeting(roomId: string, hostId: string): Promise<IMeetingDocument> {
    try {
      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.host.toString() !== hostId) {
        throw new Error('Only the host can end the meeting');
      }

      meeting.status = 'ended';
      meeting.endTime = new Date();

      // Calculate durations for all participants
      meeting.participants.forEach(participant => {
        if (!participant.leftAt) {
          participant.leftAt = new Date();
          if (participant.joinedAt) {
            participant.duration = Math.floor(
              (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000,
            );
          }
        }
      });

      await meeting.save();

      // Populate meeting data
      await meeting.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('Meeting ended', {
        meetingId: meeting._id,
        roomId,
        hostId,
        totalDuration: meeting.endTime.getTime() - meeting.startTime.getTime(),
      });

      return meeting;
    } catch (error) {
      logger.error('Failed to end meeting', {
        roomId,
        hostId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Cancel scheduled meeting
  static async cancelMeeting(roomId: string, hostId: string): Promise<IMeetingDocument> {
    try {
      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      if (meeting.host.toString() !== hostId) {
        throw new Error('Only the host can cancel the meeting');
      }

      if (meeting.status !== 'scheduled') {
        throw new Error('Only scheduled meetings can be cancelled');
      }

      meeting.status = 'cancelled';

      await meeting.save();

      logger.info('Meeting cancelled', {
        meetingId: meeting._id,
        roomId,
        hostId,
      });

      return meeting;
    } catch (error) {
      logger.error('Failed to cancel meeting', {
        roomId,
        hostId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
