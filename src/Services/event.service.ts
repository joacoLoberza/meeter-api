import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { CreateEventDto } from '../Rutas/dto/create-event.dto'
import { UpdateEventDto } from '../Rutas/dto/update-event.dto'

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value?: string) {
    return value ? new Date(value) : undefined
  }

  private async ensureEventCategoryExists(categoryFK: number) {
    const category = await this.prisma.eventCategories.findUnique({
      where: { id: categoryFK },
    })
    if (!category) {
      throw new BadRequestException('La categoría de evento especificada no existe')
    }
  }

  async create(dto: CreateEventDto, userId: string) {
    const data: any = {
      userFK: Number(userId),
      name: dto.name,
      description: dto.description ?? null,
      initDate: this.parseDate(dto.initDate),
      location: dto.location,
      categoryFK: dto.categoryFK,
      ticketPrice: dto.ticketPrice,
    }

    await this.ensureEventCategoryExists(dto.categoryFK)

    if (dto.image) {
      data.image = dto.image
    }
    if (dto.endingDate) {
      data.endingDate = this.parseDate(dto.endingDate)
    }

    return this.prisma.events.create({ data })
  }

  async findAll(query: Record<string, any>) {
    const where: any = {
      open: query.open !== undefined ? query.open === 'true' : true,
    }

    if (query.categoryFK !== undefined) {
      where.categoryFK = Number(query.categoryFK)
    }
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' }
    }

    const initDateFilter: any = {}
    if (query.from) {
      initDateFilter.gte = this.parseDate(query.from)
    }
    if (query.to) {
      initDateFilter.lte = this.parseDate(query.to)
    }
    if (Object.keys(initDateFilter).length) {
      where.initDate = initDateFilter
    }

    return this.prisma.events.findMany({
      where,
      orderBy: { initDate: 'asc' },
      include: {
        category: true,
        owner: true,
        _count: { select: { guestsRel: true } },
      },
    })
  }

  async findOne(id: string, userId?: string) {
    const event = await this.prisma.events.findUnique({
      where: { id: Number(id) },
      include: {
        category: true,
        owner: true,
        guestsRel: { select: { userFK: true } },
        _count: { select: { guestsRel: true } },
      },
    })

    if (!event) {
      throw new NotFoundException('Evento no encontrado')
    }

    if (!event.open) {
      if (!userId) {
        throw new ForbiddenException('Evento privado')
      }
      const currentUserId = Number(userId)
      const isGuest = event.guestsRel.some((guest) => guest.userFK === currentUserId)
      if (event.userFK !== currentUserId && !isGuest) {
        throw new ForbiddenException('No tienes permiso para ver este evento')
      }
    }

    return event
  }

  async update(id: string, dto: UpdateEventDto, userId: string) {
    const event = await this.prisma.events.findUnique({ where: { id: Number(id) } })
    if (!event) {
      throw new NotFoundException('Evento no encontrado')
    }

    if (event.userFK !== Number(userId)) {
      throw new ForbiddenException('Solo el dueño puede actualizar el evento')
    }

    const data: any = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.description !== undefined) data.description = dto.description
    if (dto.image !== undefined) data.image = dto.image
    if (dto.initDate !== undefined) data.initDate = this.parseDate(dto.initDate)
    if (dto.endingDate !== undefined) data.endingDate = this.parseDate(dto.endingDate)
    if (dto.location !== undefined) data.location = dto.location
    if (dto.open !== undefined) data.open = dto.open
    if (dto.categoryFK !== undefined) {
      await this.ensureEventCategoryExists(dto.categoryFK)
      data.categoryFK = dto.categoryFK
    }
    if (dto.ticketPrice !== undefined) data.ticketPrice = dto.ticketPrice

    return this.prisma.events.update({ where: { id: Number(id) }, data })
  }

  async remove(id: string, userId: string) {
    const event = await this.prisma.events.findUnique({ where: { id: Number(id) } })
    if (!event) {
      throw new NotFoundException('Evento no encontrado')
    }

    if (event.userFK !== Number(userId)) {
      throw new ForbiddenException('Solo el dueño puede eliminar el evento')
    }

    return this.prisma.events.delete({ where: { id: Number(id) } })
  }
}
