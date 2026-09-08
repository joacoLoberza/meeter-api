import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { ChatsController } from './chats.controller.js';
import { ChatsService } from './chats.service.js';
import { ChatsGateway } from './chats.gateway.js';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway],
  exports: [ChatsService, ChatsGateway],
})
export class ChatsModule {}
