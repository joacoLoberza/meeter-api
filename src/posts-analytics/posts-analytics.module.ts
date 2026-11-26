import { Module } from '@nestjs/common';
import { PostsAnalyticsService } from './posts-analytics.service';
import { PostsAnalyticsController } from './posts-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PostsAnalyticsController],
  providers: [PostsAnalyticsService],
  exports: [PostsAnalyticsService],
})
export class PostsAnalyticsModule {}
