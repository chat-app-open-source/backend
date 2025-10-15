/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import logger from '../config/logger';
import { Call, Conversation, Meeting } from '../models';
import type { ICallDocument } from '../types';

export class CallService {
  // Initiate a call
  static async initiateCall(
    initiatorId: string,
    conversationId: string,
    type: 'audio' | 'video',
    participantIds: string[],
    _offer: RTCSessionDescriptionInit,
  ): Promise<ICallDocument> {
    try {
      let conversation: any = null;

      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          throw new Error('Conversation not found');
        }

        if (!conversation.isUserParticipant(initiatorId)) {
          throw new Error('User is not a participant in this conversation');
        }

        // Validate all participants are in the conversation
        for (const participantId of participantIds) {
          if (!conversation.isUserParticipant(participantId)) {
            throw new Error(`User ${participantId} is not in the conversation`);
          }
        }
      }

      const call = new Call({
        type,
        participants: [
          {
            userId: new mongoose.Types.ObjectId(initiatorId),
            status: 'joined',
            joinedAt: new Date(),
            audioEnabled: true,
            videoEnabled: type === 'video',
            screenShared: false,
          },
          ...participantIds.map(participantId => ({
            userId: new mongoose.Types.ObjectId(participantId),
            status: 'calling',
            audioEnabled: true,
            videoEnabled: type === 'video',
            screenShared: false,
          })),
        ],
        initiator: new mongoose.Types.ObjectId(initiatorId),
        conversationId: conversationId ? new mongoose.Types.ObjectId(conversationId) : undefined,
        status: 'calling',
      });

      await call.save();

      // Populate call data
      await call.populate('initiator', 'username firstName lastName profilePicture');
      await call.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('Call initiated', {
        callId: call._id,
        initiatorId,
        conversationId,
        type,
        participantCount: participantIds.length + 1,
      });

      return call;
    } catch (error) {
      logger.error('Failed to initiate call', {
        initiatorId,
        conversationId,
        type,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Initiate meeting call
  static async initiateMeetingCall(
    initiatorId: string,
    meetingId: string,
    type: 'audio' | 'video',
    _offer: RTCSessionDescriptionInit,
  ): Promise<ICallDocument> {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      // Check if user is in the meeting
      const participant = meeting.participants.find(
        p => p.userId.toString() === initiatorId && !p.leftAt,
      );

      if (!participant) {
        throw new Error('User is not a participant in this meeting');
      }

      const call = new Call({
        type,
        participants: [
          {
            userId: new mongoose.Types.ObjectId(initiatorId),
            status: 'joined',
            joinedAt: new Date(),
            audioEnabled: true,
            videoEnabled: type === 'video',
            screenShared: false,
          },
        ],
        initiator: new mongoose.Types.ObjectId(initiatorId),
        meetingId: new mongoose.Types.ObjectId(meetingId),
        status: 'calling',
      });

      await call.save();

      await call.populate('initiator', 'username firstName lastName profilePicture');
      await call.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('Meeting call initiated', {
        callId: call._id,
        initiatorId,
        meetingId,
        type,
      });

      return call;
    } catch (error) {
      logger.error('Failed to initiate meeting call', {
        initiatorId,
        meetingId,
        type,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Accept a call
  static async acceptCall(
    callId: string,
    userId: string,
    _answer: RTCSessionDescriptionInit,
  ): Promise<ICallDocument> {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      const participant = call.participants.find(p => p.userId.toString() === userId);

      if (!participant) {
        throw new Error('User is not a participant in this call');
      }

      participant.status = 'joined';
      participant.joinedAt = new Date();
      participant.screenShared = false; // Ensure screenShared is set

      // If this is the first participant to join, update call status
      const joinedParticipants = call.participants.filter(p => p.status === 'joined');
      if (joinedParticipants.length >= 2 && call.status === 'calling') {
        call.status = 'active';
        call.startTime = new Date();
      }

      await call.save();
      await call.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('Call accepted', {
        callId,
        userId,
      });

      return call;
    } catch (error) {
      logger.error('Failed to accept call', {
        callId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Reject a call
  static async rejectCall(
    callId: string,
    userId: string,
    reason: string = 'rejected',
  ): Promise<ICallDocument> {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      const participant = call.participants.find(p => p.userId.toString() === userId);

      if (!participant) {
        throw new Error('User is not a participant in this call');
      }

      participant.status = 'rejected';
      participant.screenShared = false;

      // Check if all participants have rejected or no one will join
      const activeParticipants = call.participants.filter(
        p => p.status === 'calling' || p.status === 'joined',
      );

      if (activeParticipants.length === 0) {
        call.status = 'ended';
        call.endTime = new Date();
      }

      await call.save();
      await call.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('Call rejected', {
        callId,
        userId,
        reason,
      });

      return call;
    } catch (error) {
      logger.error('Failed to reject call', {
        callId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Join an active call
  static async joinCall(callId: string, userId: string): Promise<ICallDocument> {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      if (call.status !== 'active') {
        throw new Error('Call is not active');
      }

      const participant = call.participants.find(p => p.userId.toString() === userId);

      if (!participant) {
        // Add user to call if not already a participant
        call.participants.push({
          userId: new mongoose.Types.ObjectId(userId),
          status: 'joined',
          joinedAt: new Date(),
          audioEnabled: true,
          videoEnabled: call.type === 'video',
          screenShared: false,
        });
      } else {
        participant.status = 'joined';
        participant.joinedAt = new Date();
        participant.screenShared = false;
      }

      await call.save();
      await call.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('User joined call', {
        callId,
        userId,
      });

      return call;
    } catch (error) {
      logger.error('Failed to join call', {
        callId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Leave a call
  static async leaveCall(callId: string, userId: string): Promise<ICallDocument> {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      const participant = call.participants.find(p => p.userId.toString() === userId && !p.leftAt);

      if (!participant) {
        throw new Error('User is not an active participant in this call');
      }

      // Mark participant as left
      participant.leftAt = new Date();
      if (participant.joinedAt) {
        participant.duration = Math.floor(
          (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000,
        );
      }

      // Update call status if all participants have left
      const activeParticipants = call.participants.filter(p => !p.leftAt && p.status === 'joined');

      if (activeParticipants.length === 0) {
        call.status = 'ended';
        call.endTime = new Date();
        if (call.startTime) {
          call.duration = Math.floor((call.endTime.getTime() - call.startTime.getTime()) / 1000);
        }
      }

      await call.save();
      await call.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('User left call', {
        callId,
        userId,
        duration: participant.duration,
      });

      return call;
    } catch (error) {
      logger.error('Failed to leave call', {
        callId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // End a call (for initiator or admin)
  static async endCall(callId: string, userId: string): Promise<ICallDocument> {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      // Check if user is initiator or has permission to end call
      if (call.initiator.toString() !== userId) {
        throw new Error('Only the call initiator can end the call');
      }

      call.status = 'ended';
      call.endTime = new Date();

      if (call.startTime) {
        call.duration = Math.floor((call.endTime.getTime() - call.startTime.getTime()) / 1000);
      }

      // Mark all participants as left
      call.participants.forEach(participant => {
        if (!participant.leftAt) {
          participant.leftAt = new Date();
          if (participant.joinedAt) {
            participant.duration = Math.floor(
              (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000,
            );
          }
        }
      });

      await call.save();
      await call.populate('participants.userId', 'username firstName lastName profilePicture');

      logger.info('Call ended', {
        callId,
        userId,
        duration: call.duration,
      });

      return call;
    } catch (error) {
      logger.error('Failed to end call', {
        callId,
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Toggle participant audio
  static async toggleAudio(
    callId: string,
    userId: string,
    enabled: boolean,
  ): Promise<ICallDocument> {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      const participant = call.participants.find(p => p.userId.toString() === userId && !p.leftAt);

      if (!participant) {
        throw new Error('User is not an active participant in this call');
      }

      participant.audioEnabled = enabled;

      await call.save();

      logger.debug('Audio toggled', {
        callId,
        userId,
        enabled,
      });

      return call;
    } catch (error) {
      logger.error('Failed to toggle audio', {
        callId,
        userId,
        enabled,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Toggle participant video
  static async toggleVideo(
    callId: string,
    userId: string,
    enabled: boolean,
  ): Promise<ICallDocument> {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      const participant = call.participants.find(p => p.userId.toString() === userId && !p.leftAt);

      if (!participant) {
        throw new Error('User is not an active participant in this call');
      }

      participant.videoEnabled = enabled;

      await call.save();

      logger.debug('Video toggled', {
        callId,
        userId,
        enabled,
      });

      return call;
    } catch (error) {
      logger.error('Failed to toggle video', {
        callId,
        userId,
        enabled,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Toggle screen sharing
  static async toggleScreenShare(
    callId: string,
    userId: string,
    sharing: boolean,
  ): Promise<ICallDocument> {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      const participant = call.participants.find(p => p.userId.toString() === userId && !p.leftAt);

      if (!participant) {
        throw new Error('User is not an active participant in this call');
      }

      participant.screenShared = sharing;

      await call.save();

      logger.debug('Screen share toggled', {
        callId,
        userId,
        sharing,
      });

      return call;
    } catch (error) {
      logger.error('Failed to toggle screen share', {
        callId,
        userId,
        sharing,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Get call history for user
  static async getCallHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    calls: ICallDocument[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [calls, total] = await Promise.all([
        Call.find({
          'participants.userId': new mongoose.Types.ObjectId(userId),
          status: { $in: ['ended', 'rejected', 'missed'] },
        })
          .populate('initiator', 'username firstName lastName profilePicture')
          .populate('participants.userId', 'username firstName lastName profilePicture')
          .populate('conversationId', 'name type avatar')
          .populate('meetingId', 'title roomId')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Call.countDocuments({
          'participants.userId': new mongoose.Types.ObjectId(userId),
          status: { $in: ['ended', 'rejected', 'missed'] },
        }),
      ]);

      return {
        calls,
        total,
        hasMore: skip + calls.length < total,
      };
    } catch (error) {
      logger.error('Failed to get call history', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Get active call
  static async getActiveCall(callId: string): Promise<ICallDocument | null> {
    try {
      const call = await Call.findOne({
        _id: callId,
        status: { $in: ['calling', 'active'] },
      })
        .populate('initiator', 'username firstName lastName profilePicture')
        .populate('participants.userId', 'username firstName lastName profilePicture');

      return call;
    } catch (error) {
      logger.error('Failed to get active call', {
        callId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Add call recording
  static async addCallRecording(
    callId: string,
    recordingData: {
      url: string;
      duration: number;
      startedAt: Date;
      endedAt: Date;
    },
  ): Promise<ICallDocument> {
    try {
      const call = await Call.findById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      call.callRecordings = call.callRecordings || [];
      call.callRecordings.push(recordingData);

      await call.save();

      logger.info('Call recording added', {
        callId,
        duration: recordingData.duration,
      });

      return call;
    } catch (error) {
      logger.error('Failed to add call recording', {
        callId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
