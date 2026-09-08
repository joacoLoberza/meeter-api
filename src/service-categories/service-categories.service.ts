import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto.js';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceCategoryDto) {
    const existing = await this.prisma.serviceCategories.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Category with name "${dto.name}" already exists.`,
      );
    }

    const newCategory = await this.prisma.serviceCategories.create({
      data: { name: dto.name },
    });

    return {
      message: 'Service category created successfully.',
      category: newCategory,
    };
  }

  async findAll() {
    return this.prisma.serviceCategories.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.serviceCategories.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Service category with ID ${id} not found.`,
      );
    }

    const servicesCount = await this.prisma.services.count({
      where: { categoryFK: id, deletedAt: null },
    });

    if (servicesCount > 0) {
      throw new BadRequestException(
        'Cannot delete category because active services are assigned to it.',
      );
    }

    await this.prisma.serviceCategories.delete({
      where: { id },
    });

    return {
      message: 'Service category deleted successfully.',
    };
  }
}
