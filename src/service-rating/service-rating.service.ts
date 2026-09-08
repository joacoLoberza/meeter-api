import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceRatingDto } from './dto/create-service-rating.dto.js';

@Injectable()
export class ServiceRatingService {
  constructor(private readonly prisma: PrismaService) {}

  async rateService(dto: CreateServiceRatingDto, userId: number) {
    // 1. Verificar que el servicio exista y no esté eliminado
    const service = await this.prisma.services.findFirst({
      where: {
        id: dto.serviceId,
        deletedAt: null,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${dto.serviceId} not found.`);
    }

    // 2. Verificar que el usuario haya contratado este servicio en un evento finalizado
    const now = new Date();
    const validContract = await this.prisma.contrats.findFirst({
      where: {
        serviceFK: dto.serviceId,
        event: {
          userFK: userId,
          endingDate: {
            not: null,
            lt: now,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Tomar el contrato más viejo
      },
      include: {
        event: true,
      },
    });

    if (!validContract) {
      throw new ForbiddenException(
        'You can only rate a service if you hired it for an event that has already ended.',
      );
    }

    // 3. Crear o actualizar la calificación en ServiceRating
    const existingRating = await this.prisma.serviceRating.findUnique({
      where: {
        serviceFK_userFK: {
          serviceFK: dto.serviceId,
          userFK: userId,
        },
      },
    });

    let ratingRecord;
    if (existingRating) {
      ratingRecord = await this.prisma.serviceRating.update({
        where: { id: existingRating.id },
        data: { rate: dto.rate },
      });
    } else {
      ratingRecord = await this.prisma.serviceRating.create({
        data: {
          serviceFK: dto.serviceId,
          userFK: userId,
          rate: dto.rate,
        },
      });
    }

    // 4. Calcular el promedio de todas las calificaciones de este servicio y actualizar la tabla Services
    const aggregate = await this.prisma.serviceRating.aggregate({
      where: { serviceFK: dto.serviceId },
      _avg: { rate: true },
    });

    const averageRating = Math.round(aggregate._avg.rate ?? 0);

    await this.prisma.services.update({
      where: { id: dto.serviceId },
      data: { rating: averageRating },
    });

    return {
      message: existingRating
        ? 'Service rating updated successfully.'
        : 'Service rating created successfully.',
      rating: ratingRecord,
      averageRating,
    };
  }
}
