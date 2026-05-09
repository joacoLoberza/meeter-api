import { Injectable, ConflictException } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { CreateCategoryDto } from '../Rutas/dto/create-category.dto'

@Injectable()
export class EventCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.eventCategories.findUnique({
      where: { name: dto.name },
    })
    if (existing) {
      throw new ConflictException('La categoría de evento ya existe')
    }
    return this.prisma.eventCategories.create({
      data: { name: dto.name },
    })
  }

  async findAll() {
    return this.prisma.eventCategories.findMany({
      orderBy: { name: 'asc' },
    })
  }
}
