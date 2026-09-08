import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { ChatsGateway } from './chats.gateway.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UpdateMessageDto } from './dto/update-message.dto.js';
import { AddMemberDto } from './dto/add-member.dto.js';

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly chatsGateway: ChatsGateway,
  ) {}

  // Extrae el public_id de Cloudinary desde una URL pública
  private extractPublicId(url: string): string | null {
    try {
      if (!url || url.includes('undefined.com')) return null;
      const parts = url.split('/');
      const filename = parts.pop();
      const folder = parts.pop();
      if (!filename || !folder) return null;
      const publicId = filename.split('.')[0];
      return `${folder}/${publicId}`;
    } catch {
      return null;
    }
  }

  // 3.1 POST /chats - Crear Chat
  async create(
    dto: CreateChatDto,
    userFK: number,
    file?: Express.Multer.File,
  ) {
    if (dto.eventId) {
      const eventExists = await this.prisma.events.findUnique({
        where: { id: dto.eventId },
      });
      if (!eventExists) {
        throw new NotFoundException(`Event with ID ${dto.eventId} not found.`);
      }
    }

    let imageUrl = 'https://undefined.com';
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file.buffer,
        'chats',
      );
      imageUrl = uploadResult.secure_url;
    }

    // Regla: si manda evento por default destroyAfterEvent es true, si no, false
    const destroyAfterEvent =
      dto.destroyAfterEvent !== undefined
        ? dto.destroyAfterEvent
        : dto.eventId !== undefined;

    // Miembros iniciales
    const membersData: { userFK: number; isAdmin: boolean; isApproved: boolean }[] = [
      { userFK, isAdmin: true, isApproved: true },
    ];

    if (dto.targetUserId && dto.targetUserId !== userFK) {
      const targetExists = await this.prisma.user.findUnique({
        where: { id: dto.targetUserId },
      });
      if (targetExists) {
        membersData.push({
          userFK: dto.targetUserId,
          isAdmin: false,
          isApproved: true,
        });
      }
    }

    const newChat = await this.prisma.chats.create({
      data: {
        name: dto.name,
        image: imageUrl,
        type: dto.type ?? 'CHAT',
        addMembers: dto.addMembers ?? true,
        sendMessages: dto.sendMessages ?? true,
        approveNewMembers: dto.approveNewMembers ?? false,
        destroyAfterEvent,
        membersAmount: membersData.length,
        ...(dto.eventId && { event: { connect: { id: dto.eventId } } }),
        chatMembersRel: {
          create: membersData,
        },
      },
      include: {
        event: { select: { name: true } },
        chatMembersRel: {
          include: {
            user: { select: { id: true, name: true, image: true, user: true } },
          },
        },
      },
    });

    return {
      message: 'Chat created successfully.',
      chat: {
        ...newChat,
        eventName: newChat.event?.name ?? null,
      },
    };
  }

  // 3.2 PATCH /chats/:id - Actualizar Chat (Solo Admin)
  async update(
    id: number,
    dto: UpdateChatDto,
    userFK: number,
    file?: Express.Multer.File,
  ) {
    const existingChat = await this.prisma.chats.findUnique({
      where: { id },
    });

    if (!existingChat) {
      throw new NotFoundException(`Chat with ID ${id} not found.`);
    }

    // Verificar permiso de administrador
    const member = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: id, userFK } },
    });

    if (!member || !member.isAdmin || !member.isApproved) {
      throw new ForbiddenException(
        'Only chat administrators can update chat settings.',
      );
    }

    if (dto.eventId) {
      const eventExists = await this.prisma.events.findUnique({
        where: { id: dto.eventId },
      });
      if (!eventExists) {
        throw new NotFoundException(`Event with ID ${dto.eventId} not found.`);
      }
    }

    let imageUrl = existingChat.image;
    if (file) {
      if (existingChat.image) {
        const publicId = this.extractPublicId(existingChat.image);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      }
      const uploadResult = await this.cloudinaryService.uploadImage(
        file.buffer,
        'chats',
      );
      imageUrl = uploadResult.secure_url;
    }

    const updatedChat = await this.prisma.chats.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        image: imageUrl,
        ...(dto.addMembers !== undefined && { addMembers: dto.addMembers }),
        ...(dto.sendMessages !== undefined && { sendMessages: dto.sendMessages }),
        ...(dto.approveNewMembers !== undefined && {
          approveNewMembers: dto.approveNewMembers,
        }),
        ...(dto.destroyAfterEvent !== undefined && {
          destroyAfterEvent: dto.destroyAfterEvent,
        }),
        ...(dto.eventId !== undefined && {
          event: dto.eventId
            ? { connect: { id: dto.eventId } }
            : { disconnect: true },
        }),
      },
      include: {
        event: { select: { name: true } },
      },
    });

    const formattedChat = {
      ...updatedChat,
      eventName: updatedChat.event?.name ?? null,
    };

    this.chatsGateway.emitChatUpdated(id, formattedChat);

    return {
      message: 'Chat updated successfully.',
      chat: formattedChat,
    };
  }

  // 3.3 DELETE /chats/:id - Eliminar Chat (Solo Admin, cascada en DB)
  async remove(id: number, userFK: number) {
    const existingChat = await this.prisma.chats.findUnique({
      where: { id },
    });

    if (!existingChat) {
      throw new NotFoundException(`Chat with ID ${id} not found.`);
    }

    const member = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: id, userFK } },
    });

    if (!member || !member.isAdmin || !member.isApproved) {
      throw new ForbiddenException(
        'Only chat administrators can delete this chat.',
      );
    }

    // Eliminar imagen de Cloudinary si no es la default
    if (existingChat.image) {
      const publicId = this.extractPublicId(existingChat.image);
      if (publicId) {
        await this.cloudinaryService.deleteImage(publicId);
      }
    }

    // Borrado del chat: cascada elimina miembros, mensajes, seens y reacciones
    await this.prisma.chats.delete({
      where: { id },
    });

    this.chatsGateway.emitChatDeleted(id);

    return {
      message: 'Chat and all associated resources deleted successfully.',
    };
  }

  // 3.4 GET /chats - Obtener chats del usuario
  async findAllForUser(userFK: number) {
    const userChats = await this.prisma.chats.findMany({
      where: {
        chatMembersRel: {
          some: {
            userFK,
            isApproved: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        event: {
          select: { name: true },
        },
      },
      orderBy: { id: 'desc' },
    });

    return userChats.map((chat) => ({
      id: chat.id,
      name: chat.name,
      image: chat.image,
      eventName: chat.event?.name ?? null,
    }));
  }

  // 3.5 GET /chats/:id - Obtener chat por ID con mensajes y actualización de Seens
  async findOneWithMessages(id: number, userFK: number) {
    const member = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: id, userFK } },
    });

    if (!member || !member.isApproved) {
      throw new ForbiddenException(
        'You do not have permission to access this chat.',
      );
    }

    const chat = await this.prisma.chats.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        type: true,
        membersAmount: true,
        event: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            userFK: true,
            text: true,
            image: true,
            reactions: true,
            seen: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: { id: true, name: true, image: true, user: true },
            },
            seens: {
              select: { userFK: true },
            },
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${id} not found.`);
    }

    // Procesar seguimiento de mensajes vistos (Seens)
    const newlySeenIds = await this.processMessageSeens(chat, userFK);

    return {
      id: chat.id,
      name: chat.name,
      image: chat.image,
      eventName: chat.event?.name ?? null,
      messages: chat.messages.map(({ seens, ...msg }) => ({
        ...msg,
        seen: msg.seen || newlySeenIds.has(msg.id),
      })),
    };
  }

  // 3.6 GET /chats/:id/details - Ver detalles del chat
  async getDetails(id: number, userFK: number) {
    const currentMember = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: id, userFK } },
    });

    if (!currentMember || !currentMember.isApproved) {
      throw new ForbiddenException(
        'You do not have access to this chat details.',
      );
    }

    const isAdmin = Boolean(currentMember.isAdmin);

    const chat = await this.prisma.chats.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        type: true,
        addMembers: true,
        sendMessages: true,
        approveNewMembers: true,
        eventId: true,
        destroyAfterEvent: true,
        membersAmount: true,
        event: { select: { name: true } },
        chatMembersRel: {
          where: isAdmin ? {} : { isApproved: true },
          select: {
            id: true,
            userFK: true,
            isAdmin: true,
            isApproved: true,
            user: {
              select: { id: true, name: true, image: true, user: true },
            },
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${id} not found.`);
    }

    return {
      id: chat.id,
      name: chat.name,
      image: chat.image,
      type: chat.type,
      permissions: {
        addMembers: chat.addMembers,
        sendMessages: chat.sendMessages,
        approveNewMembers: chat.approveNewMembers,
      },
      eventId: chat.eventId,
      eventName: chat.event?.name ?? null,
      membersAmount: chat.membersAmount,
      destroyAfterEvent: chat.destroyAfterEvent,
      members: chat.chatMembersRel,
    };
  }

  // 3.7 POST /chats/:id/messages - Agregar mensaje
  async createMessage(
    chatId: number,
    dto: CreateMessageDto,
    userFK: number,
    file?: Express.Multer.File,
  ) {
    if (!dto.text && !file) {
      throw new BadRequestException('Message must contain either text or an image.');
    }

    const member = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: chatId, userFK } },
    });

    if (!member || !member.isApproved) {
      throw new ForbiddenException(
        'You are not an approved member of this chat.',
      );
    }

    const chat = await this.prisma.chats.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found.`);
    }

    if (!chat.sendMessages && !member.isAdmin) {
      throw new ForbiddenException('Sending messages is disabled in this chat.');
    }

    let imageUrl: string | null = null;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file.buffer,
        'messages',
      );
      imageUrl = uploadResult.secure_url;
    }

    const now = new Date();

    const newMessage = await this.prisma.messages.create({
      data: {
        chatFK: chatId,
        userFK,
        text: dto.text ?? null,
        image: imageUrl,
        reactions: {},
        seen: false,
        createdAt: now,
        updatedAt: now,
        seens: {
          create: {
            userFK,
          },
        },
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, user: true },
        },
      },
    });

    this.chatsGateway.emitNewMessage(chatId, newMessage);

    return {
      message: 'Message created successfully.',
      data: newMessage,
    };
  }

  // 3.8 PATCH /chats/messages/:messageId - Editar mensaje
  async updateMessage(
    messageId: number,
    dto: UpdateMessageDto,
    userFK: number,
  ) {
    const existingMessage = await this.prisma.messages.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage) {
      throw new NotFoundException(`Message with ID ${messageId} not found.`);
    }

    if (existingMessage.userFK !== userFK) {
      throw new ForbiddenException('Only the author can edit this message.');
    }

    const updatedMessage = await this.prisma.messages.update({
      where: { id: messageId },
      data: {
        text: dto.text,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, user: true },
        },
      },
    });

    this.chatsGateway.emitMessageUpdated(
      existingMessage.chatFK,
      updatedMessage,
    );

    return {
      message: 'Message updated successfully.',
      data: updatedMessage,
    };
  }

  // 3.8 DELETE /chats/messages/:messageId - Borrar mensaje
  async removeMessage(messageId: number, userFK: number) {
    const existingMessage = await this.prisma.messages.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage) {
      throw new NotFoundException(`Message with ID ${messageId} not found.`);
    }

    const member = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: existingMessage.chatFK, userFK } },
    });

    const isAuthor = existingMessage.userFK === userFK;
    const isAdmin = Boolean(member?.isAdmin && member?.isApproved);

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this message.',
      );
    }

    if (existingMessage.image) {
      const publicId = this.extractPublicId(existingMessage.image);
      if (publicId) {
        await this.cloudinaryService.deleteImage(publicId);
      }
    }

    // Seens y Reactions se eliminan en cascada según el schema
    await this.prisma.messages.delete({
      where: { id: messageId },
    });

    this.chatsGateway.emitMessageDeleted(existingMessage.chatFK, messageId);

    return {
      message: 'Message deleted successfully.',
    };
  }

  // 3.9 POST /chats/:id/members - Añadir miembro
  async addMember(
    chatId: number,
    dto: AddMemberDto,
    requestingUserFK: number,
  ) {
    const chat = await this.prisma.chats.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found.`);
    }

    const requestingMember = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: chatId, userFK: requestingUserFK } },
    });

    if (!requestingMember || !requestingMember.isApproved) {
      throw new ForbiddenException(
        'You must be an approved member to add someone to this chat.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${dto.userId} not found.`);
    }

    const existingMembership = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: chatId, userFK: dto.userId } },
    });

    if (existingMembership) {
      if (existingMembership.isApproved) {
        throw new ConflictException('User is already a member of this chat.');
      } else {
        throw new ConflictException(
          'User already has a pending membership approval.',
        );
      }
    }

    // Permisos para añadir miembros
    if (!chat.addMembers && !requestingMember.isAdmin) {
      throw new ForbiddenException(
        'Only chat administrators can add members to this chat.',
      );
    }

    // Aprobación necesaria
    let isApproved = true;
    if (chat.approveNewMembers && !requestingMember.isAdmin) {
      isApproved = false;
    }

    const newMember = await this.prisma.chatMembers.create({
      data: {
        chatFK: chatId,
        userFK: dto.userId,
        isAdmin: false,
        isApproved,
      },
      include: {
        user: { select: { id: true, name: true, image: true, user: true } },
      },
    });

    if (isApproved) {
      await this.prisma.chats.update({
        where: { id: chatId },
        data: { membersAmount: { increment: 1 } },
      });

      this.chatsGateway.emitMemberAdded(chatId, newMember);

      return {
        message: 'Member added successfully.',
        member: newMember,
      };
    } else {
      // Notificar a los administradores del chat por WebSockets
      this.chatsGateway.emitMemberApprovalRequired(chatId, {
        chatId,
        member: newMember,
        addedBy: requestingUserFK,
      });

      return {
        message: 'Member request submitted. Waiting for admin approval.',
        member: newMember,
      };
    }
  }

  // 3.9 PATCH /chats/:id/members/:userId/approve - Aprobar miembro (Solo Admin)
  async approveMember(
    chatId: number,
    targetUserId: number,
    requestingUserFK: number,
  ) {
    const adminMember = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: chatId, userFK: requestingUserFK } },
    });

    if (!adminMember || !adminMember.isAdmin || !adminMember.isApproved) {
      throw new ForbiddenException(
        'Only chat administrators can approve new members.',
      );
    }

    const memberToApprove = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: chatId, userFK: targetUserId } },
    });

    if (!memberToApprove) {
      throw new NotFoundException(
        `Membership request for user ID ${targetUserId} not found.`,
      );
    }

    if (memberToApprove.isApproved) {
      throw new BadRequestException('This member is already approved.');
    }

    const [updatedMember] = await this.prisma.$transaction([
      this.prisma.chatMembers.update({
        where: { chatFK_userFK: { chatFK: chatId, userFK: targetUserId } },
        data: { isApproved: true },
        include: {
          user: { select: { id: true, name: true, image: true, user: true } },
        },
      }),
      this.prisma.chats.update({
        where: { id: chatId },
        data: { membersAmount: { increment: 1 } },
      }),
    ]);

    this.chatsGateway.emitMemberApproved(chatId, updatedMember);

    return {
      message: 'Member approved successfully.',
      member: updatedMember,
    };
  }

  // 3.9 DELETE /chats/:id/members/:userId - Quitar miembro o salir del chat
  async removeMember(
    chatId: number,
    targetUserId: number,
    requestingUserFK: number,
  ) {
    const requestingMember = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: chatId, userFK: requestingUserFK } },
    });

    if (!requestingMember || !requestingMember.isApproved) {
      throw new ForbiddenException(
        'You do not have access to manage members in this chat.',
      );
    }

    const isSelf = requestingUserFK === targetUserId;
    const isAdmin = Boolean(requestingMember.isAdmin);

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to remove this member.',
      );
    }

    const memberToRemove = await this.prisma.chatMembers.findUnique({
      where: { chatFK_userFK: { chatFK: chatId, userFK: targetUserId } },
    });

    if (!memberToRemove) {
      throw new NotFoundException('Member not found in this chat.');
    }

    await this.prisma.chatMembers.delete({
      where: { chatFK_userFK: { chatFK: chatId, userFK: targetUserId } },
    });

    if (memberToRemove.isApproved) {
      await this.prisma.chats.update({
        where: { id: chatId },
        data: { membersAmount: { decrement: 1 } },
      });
    }

    this.chatsGateway.emitMemberRemoved(chatId, targetUserId);

    return {
      message: isSelf
        ? 'You have left the chat.'
        : 'Member removed successfully.',
    };
  }

  // Lógica centralizada para registro de Seens y actualización de visto
  private async processMessageSeens(
    chat: {
      id: number;
      type: string;
      membersAmount: number;
      messages: {
        id: number;
        userFK: number;
        seen: boolean;
        seens: { userFK: number }[];
      }[];
    },
    userFK: number,
  ): Promise<Set<number>> {
    const newlySeenIds = new Set<number>();

    // Identificar mensajes no vistos por el usuario actual
    const messagesToMarkForUser = chat.messages.filter(
      (msg) => !msg.seens.some((s) => s.userFK === userFK),
    );

    if (messagesToMarkForUser.length === 0) {
      return newlySeenIds;
    }

    // Registrar en la tabla Seens
    await this.prisma.seens.createMany({
      data: messagesToMarkForUser.map((msg) => ({
        userFK,
        messageFK: msg.id,
      })),
      skipDuplicates: true,
    });

    const messagesToSetSeenTrue: number[] = [];

    if (chat.type === 'CHAT') {
      // En chat de 2 personas: si quien lo ve no es el emisor, se marca como visto
      for (const msg of messagesToMarkForUser) {
        if (msg.userFK !== userFK) {
          messagesToSetSeenTrue.push(msg.id);
          newlySeenIds.add(msg.id);
        }
      }
    } else {
      // En chat grupal: verificar si todos los miembros aprobados tienen registro en Seens
      const totalApprovedMembers = await this.prisma.chatMembers.count({
        where: { chatFK: chat.id, isApproved: true },
      });

      for (const msg of messagesToMarkForUser) {
        const currentSeensCount = msg.seens.length + 1; // +1 por el actual
        if (currentSeensCount >= totalApprovedMembers) {
          messagesToSetSeenTrue.push(msg.id);
          newlySeenIds.add(msg.id);
        }
      }
    }

    if (messagesToSetSeenTrue.length > 0) {
      await this.prisma.messages.updateMany({
        where: { id: { in: messagesToSetSeenTrue } },
        data: { seen: true },
      });
    }

    // Notificar por WebSocket a la sala que estos mensajes fueron leídos
    this.chatsGateway.emitMessagesSeen(chat.id, {
      userId: userFK,
      messageIds: messagesToMarkForUser.map((m) => m.id),
    });

    return newlySeenIds;
  }
}
