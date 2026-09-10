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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/createPostDto.js';
import { UpdatePostDto } from './dto/updatePostDto.js';
import { GetPostsDto } from './dto/getPostsDto.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('media', 10)) // Permite subir hasta 10 archivos
  async create(
    @Body() dto: CreatePostDto,
    @Req() req: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1; // Fallback para pruebas sin guard

    return this.postsService.create(dto, userFK, files);
  }

  @Get()
  async findAll(@Query() query: GetPostsDto, @Req() req: any) {
    const userId = req.payload?.id ?? req.payload?.sub;
    return this.postsService.findAll(query, userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.payload?.id ?? req.payload?.sub;
    return this.postsService.findOne(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.postsService.update(id, dto, userFK);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.postsService.remove(id, userFK);
  }
}