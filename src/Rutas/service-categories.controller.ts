import { Controller, Get, Post, Body } from '@nestjs/common'
import { ServiceCategoriesService } from '../Services/service-categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'

@Controller('services/categories')
export class ServiceCategoriesController {
  constructor(private readonly serviceCategoriesService: ServiceCategoriesService) {}

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.serviceCategoriesService.create(dto)
  }

  @Get()
  async findAll() {
    return this.serviceCategoriesService.findAll()
  }
}
