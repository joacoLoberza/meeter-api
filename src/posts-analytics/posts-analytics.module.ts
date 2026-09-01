import { Module } from '@nestjs/common';
import { PostsAnalyticsService } from './posts-analytics.service.js';
import { PostsAnalyticsController } from './posts-analytics.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PostsAnalyticsController],
  providers: [PostsAnalyticsService],
  exports: [PostsAnalyticsService],
})
export class PostsAnalyticsModule {}