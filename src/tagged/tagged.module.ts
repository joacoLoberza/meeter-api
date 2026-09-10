import { Module } from '@nestjs/common';
import { TaggedService } from './tagged.service.js';
import { TaggedController } from './tagged.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [TaggedController],
  providers: [TaggedService],
  exports: [TaggedService],
})
export class TaggedModule {}