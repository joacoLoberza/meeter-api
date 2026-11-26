import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from './prisma.service'
import { CreateEventDto } from '../Rutas/dto/create-event.dto'
import { UpdateEventDto } from '../Rutas/dto/update-event.dto'

type EventCoordinates = {
  latitude: number
  longitude: number
}

@Injectable()
export class EventService {
  private static readonly geocodeMemoryCache = new Map<string, EventCoordinates>()
  private static readonly geocodeInFlight = new Map<
    string,
    Promise<EventCoordinates>
  >()
  private static geocodeQueue: Promise<void> = Promise.resolve()
  private static lastGeocodeRequestAt = 0

  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value?: string) {
    return value ? new Date(value) : undefined
  }

  private async ensureEventCategoryExists(categoryFK: number) {
    const category = await this.prisma.eventCategories.findFirst({
      where: { id: categoryFK },
    })
    if (!category) {
      throw new BadRequestException('La categoría de evento especificada no existe')
    }
  }

  private readonly ownerPublicSelect = {
    id: true,
    user: true,
    name: true,
    image: true,
    verified: true,
  }

  private readonly eventPublicInclude = {
    category: {
      select: {
        id: true,
        name: true,
      },
    },
    owner: {
      select: {
        id: true,
        user: true,
        name: true,
        image: true,
        verified: true,
      },
    },
    _count: { select: { guestsRel: true } },
  } satisfies Prisma.EventsInclude

  async create(dto: CreateEventDto, userId: string, imageUrl?: string) {
    await this.ensureEventCategoryExists(dto.categoryFK)
    const location = dto.location.trim()
    if (!location) {
      throw new BadRequestException('La ubicación del evento no puede estar vacía')
    }
    const coordinates = await this.resolveCoordinates(
      location,
      dto.latitude,
      dto.longitude,
    )

    const data: any = {
      userFK: Number(userId),
      name: dto.name,
      description: dto.description ?? null,
      initDate: this.parseDate(dto.initDate),
      location,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      categoryFK: dto.categoryFK,
      ticketPrice: dto.ticketPrice,
      open: dto.open ?? false,
    }

    if (imageUrl) {
      data.image = imageUrl
    }
    if (dto.endingDate) {
      data.endingDate = this.parseDate(dto.endingDate)
    }

    const event = await this.prisma.events.create({ data })
    return this.findOne(String(event.id), userId)
  }

  async findAll(query: Record<string, any>, userId?: string) {
    const where: any = {} as any

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    if (query.categoryFK !== undefined) {
      where.categoryFK = Number(query.categoryFK)
    }
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' }
    }

    if (query.open === 'true') {
      where.open = true
    } else if (query.open === 'false') {
      where.open = false
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

    const limit = Math.min(Number(query.limit) || 20, 100)
    const cursorId = query.cursor ? Number(query.cursor) : undefined
    const orderDirection = query.order === 'desc' ? 'desc' : 'asc'
    const orderField = query.orderBy ?? 'initDate'

    const findArgs = {
      where,
      take: limit,
      orderBy: {
        [orderField]: orderDirection,
      } as Prisma.EventsOrderByWithRelationInput,
      ...(cursorId !== undefined
        ? { cursor: { id: cursorId }, skip: 1 }
        : {}),
    }

    const events = await this.prisma.events.findMany({
      ...findArgs,
      include: {
        ...this.eventPublicInclude,
        ...(userId
          ? {
              guestsRel: {
                where: { userFK: Number(userId) },
                select: { userFK: true },
              },
            }
          : {}),
      },
    })
    const data = events.map((event) => {
      const { guestsRel, ...eventData } = event
      return {
        ...eventData,
        createdById: event.userFK,
        attendees: event._count.guestsRel,
        isGuest: Boolean(guestsRel?.length),
      }
    })

    const hasMore = data.length === limit
    const lastEvent = data[data.length - 1]

    return {
      data,
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore && lastEvent ? lastEvent.id : null,
      },
    }
  }

  async findOne(id: string, userId?: string) {
    const event = await this.prisma.events.findFirst({
      where: { id: Number(id) },
      include: {
        ...this.eventPublicInclude,
        guestsRel: { select: { userFK: true } },
        ...(userId
          ? {
              eventsRatingRel: {
                where: { userFK: Number(userId) },
                select: { rate: true },
              },
            }
          : {}),
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

    const { guestsRel, eventsRatingRel, ...eventData } = event
    return {
      ...eventData,
      createdById: event.userFK,
      attendees: event._count.guestsRel,
      isGuest: guestsRel.some((guest) => guest.userFK === Number(userId)),
      myRating: eventsRatingRel?.[0]?.rate ?? null,
    }
  }

  async update(id: string, dto: UpdateEventDto, userId: string, imageUrl?: string) {
    const event = await this.prisma.events.findFirst({
      where: { id: Number(id) },
    })
    if (!event) {
      throw new NotFoundException('Evento no encontrado')
    }

    if (event.userFK !== Number(userId)) {
      throw new ForbiddenException('Solo el dueño puede actualizar el evento')
    }

    const data: any = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.description !== undefined) data.description = dto.description
    if (imageUrl !== undefined) data.image = imageUrl
    if (dto.initDate !== undefined) data.initDate = this.parseDate(dto.initDate)
    if (dto.endingDate !== undefined) data.endingDate = this.parseDate(dto.endingDate)
    if (dto.location !== undefined) {
      if (typeof dto.location !== 'string' || !dto.location.trim()) {
        throw new BadRequestException('La ubicación del evento no puede estar vacía')
      }
      data.location = dto.location.trim()
    }
    if (dto.latitude !== undefined) data.latitude = dto.latitude
    if (dto.longitude !== undefined) data.longitude = dto.longitude
    if (dto.open !== undefined) data.open = dto.open

    if (dto.categoryFK !== undefined) {
      await this.ensureEventCategoryExists(dto.categoryFK)
      data.categoryFK = dto.categoryFK
    }
    if (dto.ticketPrice !== undefined) data.ticketPrice = dto.ticketPrice

    const hasLatitude = dto.latitude !== undefined
    const hasLongitude = dto.longitude !== undefined
    if (hasLatitude !== hasLongitude) {
      throw new BadRequestException('La latitud y longitud deben actualizarse juntas')
    }

    if (hasLatitude && hasLongitude) {
      if (dto.latitude == null && dto.longitude == null) {
        data.latitude = null
        data.longitude = null
      } else {
        const coordinates = await this.resolveCoordinates(
          dto.location ?? event.location,
          dto.latitude,
          dto.longitude,
        )
        data.latitude = coordinates.latitude
        data.longitude = coordinates.longitude
      }
    } else if (
      dto.location !== undefined &&
      (this.normalizeLocation(dto.location) !==
        this.normalizeLocation(event.location) ||
        event.latitude == null ||
        event.longitude == null)
    ) {
      const coordinates = await this.resolveCoordinates(dto.location)
      data.latitude = coordinates.latitude
      data.longitude = coordinates.longitude
    }

    await this.prisma.events.update({ where: { id: Number(id) }, data })
    return this.findOne(id, userId)
  }

  private async resolveCoordinates(
    location: string,
    latitude?: number,
    longitude?: number,
  ): Promise<EventCoordinates> {
    if ((latitude == null) !== (longitude == null)) {
      throw new BadRequestException('La latitud y longitud deben enviarse juntas')
    }
    if (latitude != null && longitude != null) {
      return { latitude, longitude }
    }

    const normalizedLocation = this.normalizeLocation(location)
    if (!normalizedLocation) {
      throw new BadRequestException('La ubicación del evento no puede estar vacía')
    }

    const memoryCached = EventService.geocodeMemoryCache.get(normalizedLocation)
    if (memoryCached) return memoryCached

    const databaseCached = await this.prisma.eventGeocodeCache.findUnique({
      where: { normalizedLocation },
    })
    if (databaseCached) {
      const coordinates = {
        latitude: databaseCached.latitude,
        longitude: databaseCached.longitude,
      }
      EventService.geocodeMemoryCache.set(normalizedLocation, coordinates)
      return coordinates
    }

    const inFlight = EventService.geocodeInFlight.get(normalizedLocation)
    if (inFlight) return inFlight

    const geocoding = this.geocodeAndCache(location.trim(), normalizedLocation)
    EventService.geocodeInFlight.set(normalizedLocation, geocoding)
    try {
      return await geocoding
    } finally {
      EventService.geocodeInFlight.delete(normalizedLocation)
    }
  }

  private async geocodeAndCache(
    location: string,
    normalizedLocation: string,
  ): Promise<EventCoordinates> {
    const coordinates = await this.requestGeocodingService(location)
    await this.prisma.eventGeocodeCache.upsert({
      where: { normalizedLocation },
      create: { normalizedLocation, ...coordinates },
      update: coordinates,
    })
    EventService.geocodeMemoryCache.set(normalizedLocation, coordinates)
    return coordinates
  }

  private async requestGeocodingService(
    location: string,
  ): Promise<EventCoordinates> {
    const previousRequest = EventService.geocodeQueue
    let releaseQueue!: () => void
    EventService.geocodeQueue = new Promise<void>((resolve) => {
      releaseQueue = resolve
    })
    await previousRequest

    try {
      const waitMs =
        1000 - (Date.now() - EventService.lastGeocodeRequestAt)
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }
      EventService.lastGeocodeRequestAt = Date.now()

      let endpoint: URL
      try {
        endpoint = new URL(
          process.env.MEETER_GEOCODER_URL ??
            'https://nominatim.openstreetmap.org/search',
        )
      } catch {
        throw new ServiceUnavailableException(
          'La URL del servicio de geocodificación no es válida',
        )
      }
      endpoint.searchParams.set('format', 'jsonv2')
      endpoint.searchParams.set('limit', '1')
      endpoint.searchParams.set('q', location)

      const abortController = new AbortController()
      const timeout = setTimeout(() => abortController.abort(), 10000)
      let response: Response
      try {
        response = await fetch(endpoint, {
          headers: {
            Accept: 'application/json',
            'User-Agent':
              'MatrizEvents/1.0 (+https://github.com/joacoLoberza/meeter-api)',
          },
          signal: abortController.signal,
        })
      } catch (error) {
        const message =
          error instanceof Error && error.name === 'AbortError'
            ? 'El servicio de geocodificación agotó el tiempo de espera'
            : 'No se pudo contactar el servicio de geocodificación'
        throw new ServiceUnavailableException(message)
      } finally {
        clearTimeout(timeout)
      }

      if (response.status === 429 || response.status >= 500) {
        throw new ServiceUnavailableException(
          'El servicio de geocodificación está temporalmente limitado o no disponible',
        )
      }
      if (!response.ok) {
        throw new BadGatewayException(
          'El servicio de geocodificación rechazó la consulta',
        )
      }

      let results: unknown
      try {
        results = await response.json()
      } catch {
        throw new BadGatewayException(
          'El servicio de geocodificación devolvió una respuesta inválida',
        )
      }
      if (!Array.isArray(results)) {
        throw new BadGatewayException(
          'El servicio de geocodificación devolvió una respuesta inválida',
        )
      }
      if (results.length === 0) {
        throw new BadRequestException(
          'No se encontró esa ubicación. Revisá la dirección e intentá nuevamente.',
        )
      }

      const firstResult = results[0]
      if (typeof firstResult !== 'object' || firstResult === null) {
        throw new BadGatewayException(
          'El servicio de geocodificación devolvió coordenadas inválidas',
        )
      }
      const result = firstResult as Record<string, unknown>
      const latitude = Number(result.lat)
      const longitude = Number(result.lon)
      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new BadGatewayException(
          'El servicio de geocodificación devolvió coordenadas inválidas',
        )
      }

      return { latitude, longitude }
    } finally {
      releaseQueue()
    }
  }

  private normalizeLocation(location: string): string {
    return location.trim().replace(/\s+/g, ' ').toLowerCase()
  }

  async remove(id: string, userId: string) {
    const event = await this.prisma.events.findFirst({
      where: { id: Number(id) },
    })
    if (!event) {
      throw new NotFoundException('Evento no encontrado')
    }

    if (event.userFK !== Number(userId)) {
      throw new ForbiddenException('Solo el dueño puede eliminar el evento')
    }

    const contractsCount = await this.prisma.contrats.count({
      where: { eventFK: Number(id) },
    })

    if (contractsCount > 0) {
      await this.prisma.contrats.updateMany({
        where: { eventFK: Number(id) },
        data: {
          eventFK: null as any,
        },
      })
    }

    await this.prisma.posts.deleteMany({ where: { eventFK: Number(id) } })
    await this.prisma.guests.deleteMany({ where: { eventFK: Number(id) } })
    await this.prisma.eventRating.deleteMany({ where: { eventFK: Number(id) } })
    await this.prisma.chats.deleteMany({ where: { eventId: Number(id) } })

    await this.prisma.events.delete({
      where: { id: Number(id) },
    })

    return { success: true }
  }
}
