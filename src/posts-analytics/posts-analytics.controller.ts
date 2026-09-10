import { Controller, Post, Body, Req } from '@nestjs/common';
import { PostsAnalyticsService } from './posts-analytics.service.js';
import { RecordViewDto } from './dto/recordViewDto.js';

@Controller('post-view')
export class PostsAnalyticsController {
  constructor(private readonly analyticsService: PostsAnalyticsService) {}

  @Post()
  async recordView(@Body() dto: RecordViewDto, @Req() req: any) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.analyticsService.recordView(dto, userFK);
  }
}