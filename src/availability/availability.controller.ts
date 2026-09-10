import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service.js';
import { CreateAvailabilityDto } from './dto/create-availability.dto.js';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  async create(@Body() dto: CreateAvailabilityDto, @Req() req: any) {
    const userId = req.payload?.id ?? req.payload?.sub ?? 1; // Fallback para pruebas sin guard
    const role = req.payload?.role;
    return this.availabilityService.create(dto, userId, role);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.payload?.id ?? req.payload?.sub ?? 1; // Fallback para pruebas sin guard
    const role = req.payload?.role;
    return this.availabilityService.remove(id, userId, role);
  }
}
