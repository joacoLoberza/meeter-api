import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { ServicesModule } from './services/services.module.js';
import { PostsModule } from './posts/posts.module.js';
import { PostsAnalyticsModule } from './posts-analytics/posts-analytics.module.js';
import { TaggedModule } from './tagged/tagged.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { ChatsModule } from './chats/chats.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    ServicesModule,
    PostsModule,
    PostsAnalyticsModule,
    TaggedModule,
    CommentsModule,
    ChatsModule,
  ],
})
export class AppModule {}