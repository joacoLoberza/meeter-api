import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAvailabilityDto } from './dto/create-availability.dto.js';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAvailabilityDto, userId: number, role?: string) {
    const initDate = new Date(dto.initDate);
    const endDate = new Date(dto.endDate);

    if (isNaN(initDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format.');
    }

    if (initDate >= endDate) {
      throw new BadRequestException('endDate must be later than initDate.');
    }

    const service = await this.prisma.services.findFirst({
      where: {
        id: dto.serviceId,
        deletedAt: null,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${dto.serviceId} not found.`);
    }

    if (service.userFK !== userId && role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to manage availability for this service.',
      );
    }

    const existing = await this.prisma.avilability.findUnique({
      where: {
        serviceFK_initDate_endDate: {
          serviceFK: dto.serviceId,
          initDate,
          endDate,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'This availability interval already exists for the service.',
      );
    }

    const newAvailability = await this.prisma.avilability.create({
      data: {
        serviceFK: dto.serviceId,
        initDate,
        endDate,
      },
    });

    return {
      message: 'Availability added successfully.',
      availability: newAvailability,
    };
  }

  async remove(id: number, userId: number, role?: string) {
    const availability = await this.prisma.avilability.findUnique({
      where: { id },
      include: {
        service: true,
      },
    });

    if (!availability) {
      throw new NotFoundException(`Availability with ID ${id} not found.`);
    }

    if (availability.service.userFK !== userId && role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to delete this availability.',
      );
    }

    await this.prisma.avilability.delete({
      where: { id },
    });

    return {
      message: 'Availability removed successfully.',
    };
  }
}
