import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TaggedService } from './tagged.service';
import { CreateTaggedDto } from './dto/createTaggedDto';

@Controller('tagged')
@UseGuards(JwtAuthGuard)
export class TaggedController {
  constructor(private readonly taggedService: TaggedService) {}

  @Post()
  async create(@Body() dto: CreateTaggedDto, @CurrentUser() user: any) {
    const currentUserFK = Number(user.id ?? user.sub);
    return this.taggedService.create(dto, currentUserFK);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const currentUserFK = Number(user.id ?? user.sub);
    return this.taggedService.remove(id, currentUserFK);
  }
}
