import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Req,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/createPostDto';
import { UpdatePostDto } from './dto/updatePostDto';
import { GetPostsDto } from './dto/getPostsDto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('media', 10)) // Permite subir hasta 10 archivos
  async create(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userFK = Number(user.id ?? user.sub);

    return this.postsService.create(dto, userFK, files);
  }

  @Get()
  async findAll(@Query() query: GetPostsDto, @Req() req: any) {
    const rawId = req.user?.id ?? req.user?.sub;
    const userId = rawId !== undefined ? Number(rawId) : undefined;
    return this.postsService.findAll(query, userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const rawId = req.user?.id ?? req.user?.sub;
    const userId = rawId !== undefined ? Number(rawId) : undefined;
    return this.postsService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: any,
  ) {
    const userFK = Number(user.id ?? user.sub);
    return this.postsService.update(id, dto, userFK);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const userFK = Number(user.id ?? user.sub);
    return this.postsService.remove(id, userFK);
  }
}
