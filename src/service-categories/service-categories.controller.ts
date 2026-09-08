import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service.js';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto.js';

@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  @Post()
  async create(@Body() dto: CreateServiceCategoryDto, @Req() req: any) {
    const role = req.payload?.role ?? 'ADMIN'; // Fallback para pruebas sin guard
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrators have permission to create service categories.',
      );
    }
    return this.serviceCategoriesService.create(dto);
  }

  @Get()
  async findAll() {
    return this.serviceCategoriesService.findAll();
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const role = req.payload?.role ?? 'ADMIN'; // Fallback para pruebas sin guard
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrators have permission to delete service categories.',
      );
    }
    return this.serviceCategoriesService.remove(id);
  }
}
