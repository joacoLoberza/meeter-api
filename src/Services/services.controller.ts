import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ServicesService } from './services.service';
import GetServicesDto from './dto/getServicesDto';
import { CreateServiceDto } from './dto/createServiceDto';
import { UpdateServiceDto } from './dto/updateServiceDto';
import type { Multer } from 'multer';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async findAll(@Query() query: GetServicesDto) {
    return this.servicesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateServiceDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const providerId = Number(user.id ?? user.sub);
    const imageBuffer = file?.buffer;

    return this.servicesService.create(dto, providerId, imageBuffer);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const providerId = Number(user.id ?? user.sub);
    const imageBuffer = file?.buffer;

    return this.servicesService.update(id, dto, providerId, imageBuffer);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const providerId = Number(user.id ?? user.sub);

    return this.servicesService.remove(id, providerId);
  }
}
