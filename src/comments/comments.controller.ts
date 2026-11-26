import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/createCommentDto';
import { UpdateCommentDto } from './dto/updateCommentDto';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userFK = Number(user.id ?? user.sub);
    return this.commentsService.create(dto, userFK, file);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userFK = Number(user.id ?? user.sub);
    return this.commentsService.update(id, dto, userFK, file);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    const userFK = Number(user.id ?? user.sub);
    return this.commentsService.remove(id, userFK);
  }

  @Post(':id/like')
  async likeComment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const userFK = Number(user.id ?? user.sub);
    return this.commentsService.likeComment(id, userFK);
  }

  @Delete(':id/like')
  async unlikeComment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const userFK = Number(user.id ?? user.sub);
    return this.commentsService.unlikeComment(id, userFK);
  }
}
