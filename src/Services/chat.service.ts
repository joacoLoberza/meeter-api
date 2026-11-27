import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserChats(userId: number) {
    const memberships = await this.prisma.chatMembers.findMany({
      where: { userFK: userId },
      include: {
        chat: {
          include: {
            chatMembersRel: {
              include: {
                user: {
                  select: { id: true, user: true, name: true, image: true, verified: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { text: true, createdAt: true, userFK: true },
            },
          },
        },
      },
    })

    return memberships.map(m => ({
      id: m.chat.id,
      name: m.chat.name,
      lastMessage: m.chat.messages[0] ?? null,
      members: m.chat.chatMembersRel.map(cm => ({
        id: cm.user.id,
        user: cm.user.user,
        name: cm.user.name,
        image: cm.user.image,
        verified: cm.user.verified,
        isAdmin: cm.isAdmin,
      })),
    }))
  }

  async startChat(userId: number, recipientId: number) {
    if (userId === recipientId) {
      throw new BadRequestException('No puedes crear un chat contigo mismo')
    }

    const userChats = await this.prisma.chatMembers.findMany({
      where: { userFK: userId },
      select: { chatFK: true },
    })
    const userChatIds = userChats.map(c => c.chatFK)

    const existingMembership = userChatIds.length > 0
      ? await this.prisma.chatMembers.findFirst({
          where: { chatFK: { in: userChatIds }, userFK: recipientId },
        })
      : null

    if (existingMembership) {
      const chat = await this.prisma.chats.findUnique({
        where: { id: existingMembership.chatFK },
        include: {
          chatMembersRel: {
            include: {
              user: {
                select: { id: true, user: true, name: true, image: true, verified: true },
              },
            },
          },
        },
      })
      return chat
    }

    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId } })
    if (!recipient) throw new NotFoundException('Usuario no encontrado')

    // Solo se puede abrir un chat con "amigos": quienes se siguen mutuamente.
    const mutualFollow = await this.prisma.follows.findFirst({
      where: {
        followerFK: userId,
        followingFK: recipientId,
        following: { followersRel: { some: { followerFK: userId } } },
      },
      select: { id: true },
    })

    if (!mutualFollow) {
      throw new ForbiddenException(
        'Solo podés chatear con personas que te siguen de vuelta (tus amigos)',
      )
    }

    const chat = await this.prisma.chats.create({
      data: {
        name: `Chat ${userId}-${recipientId}`,
        type: 'CHAT',
        membersAmount: 2,
        eventId: null as any,
        chatMembersRel: {
          create: [
            { userFK: userId, isAdmin: true },
            { userFK: recipientId, isAdmin: true },
          ],
        },
      },
      include: {
        chatMembersRel: {
          include: {
            user: {
              select: { id: true, user: true, name: true, image: true, verified: true },
            },
          },
        },
      },
    })

    return chat
  }

  private async assertChatMember(chatId: number, userId: number) {
    const membership = await this.prisma.chatMembers.findFirst({
      where: { chatFK: chatId, userFK: userId },
    })
    if (!membership) throw new NotFoundException('Chat no encontrado')
  }

  async getMessages(chatId: number, userId: number) {
    const chat = await this.prisma.chats.findUnique({ where: { id: chatId } })
    if (!chat) throw new NotFoundException('Chat no encontrado')
    await this.assertChatMember(chatId, userId)

    return this.prisma.messages.findMany({
      where: { chatFK: chatId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, user: true, name: true, image: true },
        },
      },
    })
  }

  async sendMessage(chatId: number, senderId: number, content: string) {
    const chat = await this.prisma.chats.findUnique({ where: { id: chatId } })
    if (!chat) throw new NotFoundException('Chat no encontrado')

    await this.assertChatMember(chatId, senderId)

    return this.prisma.messages.create({
      data: {
        chatFK: chatId,
        userFK: senderId,
        text: content,
        reactions: [],
      },
      include: {
        user: {
          select: { id: true, user: true, name: true, image: true },
        },
      },
    })
  }

  async addComment(chatId: number, userId: number, type: string, content: string) {
    const chat = await this.prisma.chats.findUnique({ where: { id: chatId } })
    if (!chat) throw new NotFoundException('Chat no encontrado')

    await this.assertChatMember(chatId, userId)

    const text = type === 'archivo' || type === 'foto' || type === 'video'
      ? `[${type}] ${content}`
      : content

    return this.prisma.messages.create({
      data: {
        chatFK: chatId,
        userFK: userId,
        text,
        image: type === 'foto' ? content : null,
        reactions: [],
      },
      include: {
        user: {
          select: { id: true, user: true, name: true, image: true },
        },
      },
    })
  }

  async getComments(chatId: number, userId: number) {
    const chat = await this.prisma.chats.findUnique({ where: { id: chatId } })
    if (!chat) throw new NotFoundException('Chat no encontrado')
    await this.assertChatMember(chatId, userId)

    return this.prisma.messages.findMany({
      where: { chatFK: chatId, image: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, user: true, name: true, image: true },
        },
      },
    })
  }
}
