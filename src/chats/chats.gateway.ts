import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinChat')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: number; userId?: number; isAdmin?: boolean },
  ) {
    if (!data?.chatId) return;
    const room = `chat_${data.chatId}`;
    client.join(room);
    this.logger.log(`Socket ${client.id} joined ${room}`);

    if (data.isAdmin) {
      const adminRoom = `chat_${data.chatId}_admins`;
      client.join(adminRoom);
      this.logger.log(`Socket ${client.id} joined admin room ${adminRoom}`);
    }

    return { event: 'joined', chatId: data.chatId };
  }

  @SubscribeMessage('leaveChat')
  handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: number },
  ) {
    if (!data?.chatId) return;
    const room = `chat_${data.chatId}`;
    const adminRoom = `chat_${data.chatId}_admins`;
    client.leave(room);
    client.leave(adminRoom);
    this.logger.log(`Socket ${client.id} left ${room}`);
    return { event: 'left', chatId: data.chatId };
  }

  // Métodos de emisión llamados desde ChatsService
  emitNewMessage(chatId: number, message: any) {
    this.server?.to(`chat_${chatId}`).emit('newMessage', message);
  }

  emitMessageUpdated(chatId: number, message: any) {
    this.server?.to(`chat_${chatId}`).emit('messageUpdated', message);
  }

  emitMessageDeleted(chatId: number, messageId: number) {
    this.server?.to(`chat_${chatId}`).emit('messageDeleted', { messageId });
  }

  emitMessagesSeen(
    chatId: number,
    payload: { userId: number; messageIds: number[] },
  ) {
    this.server?.to(`chat_${chatId}`).emit('messagesSeen', payload);
  }

  emitMemberAdded(chatId: number, member: any) {
    this.server?.to(`chat_${chatId}`).emit('memberAdded', member);
  }

  emitMemberRemoved(chatId: number, userId: number) {
    this.server?.to(`chat_${chatId}`).emit('memberRemoved', { userId });
  }

  emitMemberApprovalRequired(chatId: number, memberData: any) {
    // Notificación en tiempo real enviada exclusivamente a los administradores del chat
    this.server?.to(`chat_${chatId}_admins`).emit('memberApprovalRequired', memberData);
  }

  emitMemberApproved(chatId: number, member: any) {
    this.server?.to(`chat_${chatId}`).emit('memberApproved', member);
  }

  emitChatUpdated(chatId: number, chatData: any) {
    this.server?.to(`chat_${chatId}`).emit('chatUpdated', chatData);
  }

  emitChatDeleted(chatId: number) {
    this.server?.to(`chat_${chatId}`).emit('chatDeleted', { chatId });
  }
}
