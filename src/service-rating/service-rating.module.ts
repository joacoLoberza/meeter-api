import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ServiceRatingController } from './service-rating.controller.js';
import { ServiceRatingService } from './service-rating.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceRatingController],
  providers: [ServiceRatingService],
  exports: [ServiceRatingService],
})
export class ServiceRatingModule {}
