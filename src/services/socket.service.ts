// src/services/socket.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Server as HTTPServer } from 'http';
import type { Server as HTTPSServer } from 'https';
import { Server, Socket } from 'socket.io';
import logger from '../config/logger';
import { User } from '../models';
import type {
  CallInitiateData,
  ClientToServerEvents,
  CreateStoryData,
  OnlineUser,
  SendMessageData,
  ServerToClientEvents,
  SocketResponse,
  TypingUser,
} from '../types';
import { CallService } from './call.service';
import { ChatService } from './chat.service';
import { MeetingService } from './meeting.service';
import { StoryService } from './story.service';
import { verifyAccessToken } from './token.service';

// Extended Socket interface with user data
interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  data: {
    user: {
      _id: any;
      id: string;
      username: string;
      profilePicture?: string;
    };
    userId: string;
    userName: string;
    avatar?: string;
  };
}

export class SocketService {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private onlineUsers: Map<string, OnlineUser> = new Map();
  private typingUsers: Map<string, TypingUser> = new Map();

  constructor(server: HTTPServer | HTTPSServer) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.initializeMiddleware();
    this.initializeEventHandlers();
  }

  private initializeMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const payload = verifyAccessToken(token.replace('Bearer ', ''));
        const user = await User.findById(payload.userId).select('-password');

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        // Set user data on socket
        socket.data = {
          user: {
            _id: user._id,
            id: user._id.toString(),
            username: user.username,
            profilePicture: user.profilePicture,
          },
          userId: user._id.toString(),
          userName: user.username,
          avatar: user.profilePicture,
        };

        next();
      } catch (_error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private initializeEncryptionEvents(socket: AuthenticatedSocket): void {
    const user = socket.data.user;

    // Initialize E2E encryption
    socket.on('encryption:init', async (callback: (response: SocketResponse) => void) => {
      try {
        // Check if user already has encryption keys
        const userDoc = await User.findById(user.id).select('publicKey');

        if (!userDoc || !userDoc.publicKey) {
          callback({
            success: false,
            error: 'Encryption keys not initialized. Please set up E2E encryption first.',
          });
          return;
        }

        callback({
          success: true,
          message: 'E2E encryption ready',
          data: {
            publicKey: userDoc.publicKey,
            algorithm: 'x25519-xsalsa20-poly1305',
          },
        });
      } catch (error) {
        callback({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Exchange public keys with other users
    socket.on(
      'encryption:exchange-keys',
      async (data: { publicKey: string }, callback: (response: SocketResponse) => void) => {
        try {
          // Broadcast public key to all connected clients
          socket.broadcast.emit('encryption:keys-exchanged', {
            userId: user.id,
            publicKey: data.publicKey,
          });

          callback({
            success: true,
            message: 'Public key exchanged successfully',
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );
  }

  private initializeEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const user = socket.data.user;
      logger.info('User connected to socket', {
        userId: user.id,
        socketId: socket.id,
      });

      // Add user to online users
      this.onlineUsers.set(user.id, {
        userId: user.id,
        socketId: socket.id,
        lastSeen: new Date(),
        status: 'online',
      });

      // Notify others that user is online
      socket.broadcast.emit('user:online', {
        userId: user.id,
        socketId: socket.id,
        lastSeen: new Date(),
        status: 'online',
      });

      // Join user to their personal room
      socket.join(`user:${user.id}`);

      // Initialize all event handlers
      this.initializeChatEvents(socket);
      this.initializeCallEvents(socket);
      this.initializeMeetingEvents(socket);
      this.initializeStoryEvents(socket);
      this.initializeEncryptionEvents(socket);

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle connection errors
      socket.on('error', (error: Error) => {
        logger.error('Socket error', {
          userId: user.id,
          socketId: socket.id,
          error: error.message,
        });
      });
    });
  }

  private initializeChatEvents(socket: AuthenticatedSocket): void {
    const user = socket.data.user;

    // Send message
    socket.on(
      'message:send',
      async (data: SendMessageData, callback: (response: SocketResponse) => void) => {
        try {
          const message = await ChatService.sendMessage(data.conversationId, user.id, {
            type: data.type,
            content: data.content,
            fileUrl: data.file?.url,
            fileName: data.file?.name,
            fileSize: data.file?.size,
            fileType: data.file?.type,
            thumbnailUrl: data.file?.thumbnailUrl,
            location: data.location,
            replyTo: data.replyTo,
            mentions: data.mentions,
          });

          // Emit to all participants in the conversation
          socket.to(`conversation:${data.conversationId}`).emit('message:new', message);

          callback({
            success: true,
            message: 'Message sent successfully',
            data: message,
          });
        } catch (error) {
          logger.error('Failed to send message via socket', {
            userId: user.id,
            conversationId: data.conversationId,
            error: (error as Error).message,
          });

          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Mark message as read
    socket.on(
      'message:read',
      async (data: { messageId: string }, callback: (response: SocketResponse) => void) => {
        try {
          const message = await ChatService.markMessageAsRead(data.messageId, user.id);

          // Notify sender that message was read
          socket.to(`user:${message.senderId}`).emit('message:read', {
            messageId: data.messageId,
            readerId: user.id,
          });

          callback({
            success: true,
            message: 'Message marked as read',
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Add reaction to message
    socket.on(
      'message:react',
      async (
        data: { messageId: string; emoji: string },
        callback: (response: SocketResponse) => void,
      ) => {
        try {
          const message = await ChatService.addReaction(data.messageId, user.id, data.emoji);

          // Emit to conversation participants
          socket
            .to(`conversation:${message.conversationId.toString()}`)
            .emit('message:update', message);

          callback({
            success: true,
            message: 'Reaction added',
            data: message,
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Delete message
    socket.on(
      'message:delete',
      async (
        data: { messageId: string; forEveryone: boolean },
        callback: (response: SocketResponse) => void,
      ) => {
        try {
          await ChatService.deleteMessage(data.messageId, user.id, data.forEveryone);

          // Emit to conversation participants
          socket.to(data.messageId).emit('message:delete', {
            messageId: data.messageId,
            deletedForEveryone: data.forEveryone,
          });

          callback({
            success: true,
            message: 'Message deleted',
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Star message
    socket.on(
      'message:star',
      async (data: { messageId: string }, callback: (response: SocketResponse) => void) => {
        try {
          const message = await ChatService.starMessage(data.messageId, user.id);

          callback({
            success: true,
            message: 'Message starred',
            data: message,
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Forward messages
    socket.on(
      'message:forward',
      async (
        data: { messageIds: string[]; conversationIds: string[] },
        callback: (response: SocketResponse) => void,
      ) => {
        try {
          const result = await ChatService.forwardMessages(
            data.messageIds,
            data.conversationIds,
            user.id,
          );

          // Emit new messages to respective conversations
          Object.keys(result).forEach(conversationId => {
            result[conversationId].forEach(message => {
              socket.to(conversationId).emit('message:new', message);
            });
          });

          callback({
            success: true,
            message: 'Messages forwarded successfully',
            data: result,
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Typing indicators
    socket.on('typing:start', (data: { conversationId: string }) => {
      const typingUser: TypingUser = {
        userId: user.id,
        userName: user.username,
        conversationId: data.conversationId,
        timestamp: new Date(),
      };

      this.typingUsers.set(`${user.id}-${data.conversationId}`, typingUser);

      socket.to(`conversation:${data.conversationId}`).emit('typing:start', typingUser);

      // Auto stop typing after 3 seconds
      setTimeout(() => {
        if (this.typingUsers.has(`${user.id}-${data.conversationId}`)) {
          this.typingUsers.delete(`${user.id}-${data.conversationId}`);
          socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
            userId: user.id,
            conversationId: data.conversationId,
          });
        }
      }, 3000);
    });

    socket.on('typing:stop', (data: { conversationId: string }) => {
      this.typingUsers.delete(`${user.id}-${data.conversationId}`);
      socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
        userId: user.id,
        conversationId: data.conversationId,
      });
    });

    // Join conversation room
    socket.on('join:conversation', (data: { conversationId: string }) => {
      socket.join(`conversation:${data.conversationId}`);
      logger.debug('User joined conversation room', {
        userId: user.id,
        conversationId: data.conversationId,
      });
    });

    // Leave conversation room
    socket.on('leave:conversation', (data: { conversationId: string }) => {
      socket.leave(`conversation:${data.conversationId}`);
      logger.debug('User left conversation room', {
        userId: user.id,
        conversationId: data.conversationId,
      });
    });
  }

  private initializeCallEvents(socket: AuthenticatedSocket): void {
    const user = socket.data.user;

    // Initiate call
    socket.on(
      'call:initiate',
      async (data: CallInitiateData, callback: (response: SocketResponse) => void) => {
        try {
          let call;
          if (data.meetingId) {
            call = await CallService.initiateMeetingCall(
              user.id,
              data.meetingId,
              data.type,
              data.offer,
            );
          } else {
            if (!data.conversationId || !data.participants) {
              throw new Error('Conversation ID and participants are required for regular calls');
            }
            call = await CallService.initiateCall(
              user.id,
              data.conversationId,
              data.type,
              data.participants,
              data.offer,
            );
          }

          // Notify participants
          const targetRoom = data.meetingId || data.conversationId;
          if (targetRoom) {
            socket.to(targetRoom).emit('call:incoming', {
              callId: call._id.toString(),
              initiator: {
                id: user.id,
                name: user.username,
                avatar: user.profilePicture,
              },
              type: data.type,
              conversationId: data.conversationId,
              meetingId: data.meetingId,
              offer: data.offer,
            });
          }

          callback({
            success: true,
            message: 'Call initiated',
            data: { callId: call._id.toString() },
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Accept call
    socket.on(
      'call:accept',
      async (
        data: { callId: string; answer: RTCSessionDescriptionInit },
        callback: (response: SocketResponse) => void,
      ) => {
        try {
          const call = await CallService.acceptCall(data.callId, user.id, data.answer);

          // Notify other participants
          socket.to(`call:${data.callId}`).emit('call:accepted', {
            callId: data.callId,
            answer: data.answer,
          });

          // Join call room
          socket.join(`call:${data.callId}`);

          callback({
            success: true,
            message: 'Call accepted',
            data: call,
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Reject call
    socket.on(
      'call:reject',
      async (
        data: { callId: string; reason: string },
        callback: (response: SocketResponse) => void,
      ) => {
        try {
          // const call = await CallService.rejectCall(data.callId, user.id, data.reason);

          // Notify caller
          socket.to(`call:${data.callId}`).emit('call:rejected', {
            callId: data.callId,
            reason: data.reason,
          });

          callback({
            success: true,
            message: 'Call rejected',
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // End call
    socket.on(
      'call:end',
      async (data: { callId: string }, callback: (response: SocketResponse) => void) => {
        try {
          const call = await CallService.endCall(data.callId, user.id);

          // Notify all participants
          socket.to(`call:${data.callId}`).emit('call:ended', {
            callId: data.callId,
            reason: 'Call ended by participant',
          });

          // Leave call room
          socket.leave(`call:${data.callId}`);

          callback({
            success: true,
            message: 'Call ended',
            data: call,
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // ICE candidate exchange
    socket.on('call:ice-candidate', (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      socket.to(`call:${data.callId}`).emit('call:ice-candidate', data);
    });

    // Toggle audio
    socket.on('call:toggle-audio', (data: { callId: string; enabled: boolean }) => {
      CallService.toggleAudio(data.callId, user.id, data.enabled)
        .then(call => {
          socket.to(`call:${data.callId}`).emit('call:participant-joined', {
            callId: data.callId,
            participant: call.participants,
          });
        })
        .catch(error => {
          logger.error('Failed to toggle audio', {
            callId: data.callId,
            userId: user.id,
            error: (error as Error).message,
          });
        });
    });

    // Toggle video
    socket.on('call:toggle-video', (data: { callId: string; enabled: boolean }) => {
      CallService.toggleVideo(data.callId, user.id, data.enabled)
        .then(call => {
          socket.to(`call:${data.callId}`).emit('call:participant-joined', {
            callId: data.callId,
            participant: call.participants,
          });
        })
        .catch(error => {
          logger.error('Failed to toggle video', {
            callId: data.callId,
            userId: user.id,
            error: (error as Error).message,
          });
        });
    });

    // Join call room
    socket.on('join:call', (data: { callId: string }) => {
      socket.join(`call:${data.callId}`);
      logger.debug('User joined call room', {
        userId: user.id,
        callId: data.callId,
      });
    });

    // Leave call room
    socket.on('leave:call', (data: { callId: string }) => {
      socket.leave(`call:${data.callId}`);
      logger.debug('User left call room', {
        userId: user.id,
        callId: data.callId,
      });
    });
  }

  private initializeMeetingEvents(socket: AuthenticatedSocket): void {
    const user = socket.data.user;

    // Join meeting
    socket.on(
      'join:meeting',
      async (
        data: { roomId: string; audioEnabled?: boolean; videoEnabled?: boolean },
        callback: (response: SocketResponse) => void,
      ) => {
        try {
          const meeting = await MeetingService.joinMeeting(data.roomId, user.id, {
            audioEnabled: data.audioEnabled ?? true,
            videoEnabled: data.videoEnabled ?? true,
          });

          socket.join(`meeting:${data.roomId}`);

          // Notify other participants
          socket.to(`meeting:${data.roomId}`).emit('meeting:participant-joined', {
            meetingId: meeting._id.toString(),
            participant: {
              id: user.id,
              name: user.username,
              avatar: user.profilePicture,
              role: 'participant',
              audioEnabled: data.audioEnabled ?? true,
              videoEnabled: data.videoEnabled ?? true,
            },
          });

          callback({
            success: true,
            message: 'Joined meeting successfully',
            data: meeting,
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Leave meeting
    socket.on(
      'leave:meeting',
      async (data: { roomId: string }, callback: (response: SocketResponse) => void) => {
        try {
          const meeting = await MeetingService.leaveMeeting(data.roomId, user.id);

          socket.leave(`meeting:${data.roomId}`);

          // Notify other participants
          socket.to(`meeting:${data.roomId}`).emit('meeting:participant-left', {
            meetingId: meeting._id.toString(),
            participantId: user.id,
          });

          callback({
            success: true,
            message: 'Left meeting successfully',
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // Update meeting settings
    socket.on(
      'meeting:update-settings',
      async (
        data: { roomId: string; settings: any },
        callback: (response: SocketResponse) => void,
      ) => {
        try {
          const meeting = await MeetingService.updateMeetingSettings(
            data.roomId,
            user.id,
            data.settings,
          );

          socket.to(`meeting:${data.roomId}`).emit('meeting:settings-updated', {
            meetingId: meeting._id.toString(),
            settings: data.settings,
          });

          callback({
            success: true,
            message: 'Meeting settings updated',
            data: meeting,
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );
  }

  private initializeStoryEvents(socket: AuthenticatedSocket): void {
    const user = socket.data.user;

    // Create story
    socket.on(
      'story:create',
      async (data: CreateStoryData, callback: (response: SocketResponse) => void) => {
        try {
          const story = await StoryService.createStory(user.id, data);

          // Notify user's contacts
          socket.broadcast.emit('story:new', story);

          callback({
            success: true,
            message: 'Story created successfully',
            data: story,
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );

    // View story
    socket.on(
      'story:view',
      async (data: { storyId: string }, callback: (response: SocketResponse) => void) => {
        try {
          const story = await StoryService.viewStory(data.storyId, user.id);

          // Notify story owner
          socket.to(`user:${story.userId.toString()}`).emit('story:viewed', {
            storyId: data.storyId,
            viewerId: user.id,
          });

          callback({
            success: true,
            message: 'Story viewed',
            data: story,
          });
        } catch (error) {
          callback({
            success: false,
            error: (error as Error).message,
          });
        }
      },
    );
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    const user = socket.data.user;

    // Remove from online users
    this.onlineUsers.delete(user.id);

    // Remove typing indicators
    for (const [key, typingUser] of this.typingUsers.entries()) {
      if (typingUser.userId === user.id) {
        this.typingUsers.delete(key);
        socket.to(`conversation:${typingUser.conversationId}`).emit('typing:stop', {
          userId: user.id,
          conversationId: typingUser.conversationId,
        });
      }
    }

    // Notify others that user is offline
    socket.broadcast.emit('user:offline', {
      userId: user.id,
    });

    logger.info('User disconnected from socket', {
      userId: user.id,
      socketId: socket.id,
    });
  }

  public getIO(): Server<ClientToServerEvents, ServerToClientEvents> {
    return this.io;
  }

  // Utility methods for emitting events from controllers
  public emitToUser(userId: string, event: keyof ServerToClientEvents, data: any): void {
    const user = this.onlineUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit(event, data);
    }
  }

  public emitToConversation(
    conversationId: string,
    event: keyof ServerToClientEvents,
    data: any,
  ): void {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  public emitToRoom(roomId: string, event: keyof ServerToClientEvents, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  // Get online users
  public getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  // Update user status
  public updateUserStatus(userId: string, status: 'online' | 'away' | 'busy'): void {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.status = status;
      user.lastSeen = new Date();
      this.io.emit('user:status', { userId, status });
    }
  }
}
