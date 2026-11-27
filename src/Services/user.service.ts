import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { User } from '@prisma/client'
import { UpdateUserDto } from '../Rutas/dto/update-user.dto'
import { PrismaService } from './prisma.service'

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private readonly publicSelect = {
    id: true,
    role: true,
    user: true,
    name: true,
    email: true,
    verified: true,
    image: true,
    dni: true,
    address: true,
    cuit: true,
  }

  private readonly followUserSelect = {
    id: true,
    user: true,
    name: true,
    image: true,
    verified: true,
    role: true,
  }

  async findAll(page: number = 1, limit: number = 20): Promise<any[]> {
    const skip = (page - 1) * limit
    const users = await this.prisma.user.findMany({
      take: limit,
      skip,
      select: this.publicSelect,
    })
    return users.map((user) => {
      if (user.role !== 'OFFERER') {
        const { address, cuit, ...rest } = user
        return rest
      }
      return user
    })
  }

  /**
   * Buscador público de usuarios (autenticado) para elegir colaboradores o
   * agregar personas a la lista blanca/negra de un evento.
   * No expone email, DNI ni otros datos privados.
   */
  async searchUsers(query?: string, limit: number = 20): Promise<any[]> {
    const q = (query ?? '').trim()
    return this.prisma.user.findMany({
      where: q
        ? {
            OR: [
              { user: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      take: Math.min(Math.max(limit, 1), 50),
      orderBy: { name: 'asc' },
      select: this.followUserSelect,
    })
  }

  async findOne(id: string, currentUserId?: number): Promise<any> {
    const targetId = Number(id)
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        ...this.publicSelect,
        _count: {
          select: {
            followersRel: true,
            followingRel: true,
            eventsRel: true,
          },
        },
      },
    })
    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }

    let isFollowing = false
    if (currentUserId && currentUserId !== targetId) {
      const relation = await this.prisma.follows.findUnique({
        where: {
          followerFK_followingFK: {
            followerFK: currentUserId,
            followingFK: targetId,
          },
        },
        select: { id: true },
      })
      isFollowing = Boolean(relation)
    }

    const { _count, ...userData } = user as any
    const formatted = {
      ...userData,
      followersCount: _count.followersRel,
      followingCount: _count.followingRel,
      eventsCount: _count.eventsRel,
      isFollowing,
    }

    if (formatted.role !== 'OFFERER') {
      const { address, cuit, ...result } = formatted
      return result
    }
    return formatted
  }

  private async ensureUserExists(userId: number) {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!exists) {
      throw new NotFoundException('Usuario no encontrado')
    }
  }

  async followUser(followerId: number, targetUserId: number) {
    if (followerId === targetUserId) {
      throw new BadRequestException('No podés seguirte a vos mismo')
    }
    await this.ensureUserExists(targetUserId)

    await this.prisma.follows.upsert({
      where: {
        followerFK_followingFK: {
          followerFK: followerId,
          followingFK: targetUserId,
        },
      },
      update: {},
      create: {
        followerFK: followerId,
        followingFK: targetUserId,
      },
    })

    return {
      message: 'Usuario seguido correctamente',
      following: true,
      targetUserId,
    }
  }

  async unfollowUser(followerId: number, targetUserId: number) {
    await this.ensureUserExists(targetUserId)

    await this.prisma.follows.deleteMany({
      where: {
        followerFK: followerId,
        followingFK: targetUserId,
      },
    })

    return {
      message: 'Dejaste de seguir al usuario',
      following: false,
      targetUserId,
    }
  }

  /**
   * Lista los "amigos" del usuario: los que se siguen mutuamente.
   * Son las únicas personas con las que se puede abrir un chat.
   */
  async getFriends(userId: number, limit = 50, offset = 0) {
    const mutualFilter = {
      followerFK: userId,
      following: { followersRel: { some: { followerFK: userId } } },
    }

    const [total, rows] = await Promise.all([
      this.prisma.follows.count({ where: mutualFilter }),
      this.prisma.follows.findMany({
        where: mutualFilter,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          createdAt: true,
          following: { select: this.followUserSelect },
        },
      }),
    ])

    return {
      total,
      limit,
      offset,
      data: rows.map((r) => ({ ...r.following, followedAt: r.createdAt })),
    }
  }

  async getFollowers(userId: number, limit = 50, offset = 0) {
    await this.ensureUserExists(userId)

    const [total, rows] = await Promise.all([
      this.prisma.follows.count({ where: { followingFK: userId } }),
      this.prisma.follows.findMany({
        where: { followingFK: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          createdAt: true,
          follower: { select: this.followUserSelect },
        },
      }),
    ])

    return {
      total,
      limit,
      offset,
      data: rows.map((r) => ({ ...r.follower, followedAt: r.createdAt })),
    }
  }

  async getFollowing(userId: number, limit = 50, offset = 0) {
    await this.ensureUserExists(userId)

    const [total, rows] = await Promise.all([
      this.prisma.follows.count({ where: { followerFK: userId } }),
      this.prisma.follows.findMany({
        where: { followerFK: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          createdAt: true,
          following: { select: this.followUserSelect },
        },
      }),
    ])

    return {
      total,
      limit,
      offset,
      data: rows.map((r) => ({ ...r.following, followedAt: r.createdAt })),
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const data: any = {}
    if (dto.user !== undefined) data.user = dto.user
    if (dto.name !== undefined) data.name = dto.name
    if (dto.email !== undefined) data.email = dto.email
    if (dto.image !== undefined) data.image = dto.image
    if (dto.dni !== undefined) data.dni = dto.dni
    if (dto.cuit !== undefined) data.cuit = dto.cuit
    if (dto.address !== undefined) data.address = dto.address

    const user = await this.prisma.user.update({
      where: { id: Number(id) },
      data,
    })
    const { password, ...result } = user
    return result
  }

  async remove(id: string): Promise<{ success: boolean }> {
    await this.prisma.user.delete({ where: { id: Number(id) } })
    return { success: true }
  }
}
