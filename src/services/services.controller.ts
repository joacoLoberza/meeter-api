import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServicesService } from './services.service.js';
import GetServicesDto from './dto/getServicesDto.js';
import { CreateServiceDto } from './dto/createServiceDto.js';
import { UpdateServiceDto } from './dto/updateServiceDto.js';
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
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateServiceDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const providerId = req.payload?.id ?? req.payload?.sub;
    const imageBuffer = file?.buffer;

    return this.servicesService.create(dto, providerId, imageBuffer);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const providerId = req.payload?.id ?? req.payload?.sub;
    const imageBuffer = file?.buffer;

    return this.servicesService.update(id, dto, providerId, imageBuffer);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const providerId = req.payload?.id ?? req.payload?.sub;

    return this.servicesService.remove(id, providerId);
  }
}