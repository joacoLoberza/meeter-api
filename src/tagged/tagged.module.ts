import { Module } from '@nestjs/common';
import { TaggedService } from './tagged.service';
import { TaggedController } from './tagged.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaggedController],
  providers: [TaggedService],
  exports: [TaggedService],
})
export class TaggedModule {}
