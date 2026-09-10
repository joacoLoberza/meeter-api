import {
  Controller,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { ServiceRatingService } from './service-rating.service.js';
import { CreateServiceRatingDto } from './dto/create-service-rating.dto.js';

@Controller('service-rating')
export class ServiceRatingController {
  constructor(
    private readonly serviceRatingService: ServiceRatingService,
  ) {}

  @Post()
  async rateService(@Body() dto: CreateServiceRatingDto, @Req() req: any) {
    const userId = req.payload?.id ?? req.payload?.sub ?? 1; // Fallback para pruebas sin guard
    return this.serviceRatingService.rateService(dto, userId);
  }
}
