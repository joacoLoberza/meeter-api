import { Controller, Get, Post, Body } from '@nestjs/common'
import { EventCategoriesService } from '../Services/event-categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'

@Controller('events/categories')
export class EventCategoriesController {
  constructor(private readonly eventCategoriesService: EventCategoriesService) {}

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.eventCategoriesService.create(dto)
  }

  @Get()
  async findAll() {
    return this.eventCategoriesService.findAll()
  }
}
