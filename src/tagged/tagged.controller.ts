import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { TaggedService } from './tagged.service.js';
import { CreateTaggedDto } from './dto/createTaggedDto.js';

@Controller('tagged')
export class TaggedController {
  constructor(private readonly taggedService: TaggedService) {}

  @Post()
  async create(@Body() dto: CreateTaggedDto, @Req() req: any) {
    const currentUserFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.taggedService.create(dto, currentUserFK);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const currentUserFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.taggedService.remove(id, currentUserFK);
  }
}