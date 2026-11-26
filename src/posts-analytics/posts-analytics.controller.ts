import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PostsAnalyticsService } from './posts-analytics.service';
import { RecordViewDto } from './dto/recordViewDto';

@Controller('post-view')
@UseGuards(JwtAuthGuard)
export class PostsAnalyticsController {
  constructor(private readonly analyticsService: PostsAnalyticsService) {}

  @Post()
  async recordView(@Body() dto: RecordViewDto, @CurrentUser() user: any) {
    const userFK = Number(user.id ?? user.sub);
    return this.analyticsService.recordView(dto, userFK);
  }
}
