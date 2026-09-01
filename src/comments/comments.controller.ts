import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/createCommentDto.js';
import { UpdateCommentDto } from './dto/updateCommentDto.js';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateCommentDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.commentsService.create(dto, userFK, file);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.commentsService.update(id, dto, userFK, file);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.commentsService.remove(id, userFK);
  }

  @Post(':id/like')
  async likeComment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.commentsService.likeComment(id, userFK);
  }

  @Delete(':id/like')
  async unlikeComment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.commentsService.unlikeComment(id, userFK);
  }
}