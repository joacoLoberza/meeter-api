import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { CreatePostDto } from './dto/createPostDto.js';
import { UpdatePostDto } from './dto/updatePostDto.js';
import { GetPostsDto } from './dto/getPostsDto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // 1. POST /posts - Crear Post
  async create(
    dto: CreatePostDto,
    userFK: number,
    clientIp: string,
    files?: Express.Multer.File[],
  ) {
    // Validar que al menos exista texto o archivos
    if (!dto.text && (!files || files.length === 0)) {
      throw new BadRequestException('Post must contain either text or media.');
    }

    // Validar existencia de evento si fue proporcionado
    if (dto.eventId) {
      const eventExists = await this.prisma.events.findUnique({
        where: { id: dto.eventId },
      });
      if (!eventExists) {
        throw new NotFoundException(`Event with ID ${dto.eventId} not found.`);
      }
    }

    // Subida múltiple a Cloudinary
    let mediaUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        this.cloudinaryService.uploadImage(file.buffer, 'posts'),
      );
      const results = await Promise.all(uploadPromises);
      mediaUrls = results.map((res) => res.secure_url);
    }

    // Cálculo del rating inicial: Promedio de los 10 mejores posts / 2
    const topPosts = await this.prisma.posts.findMany({
      take: 10,
      orderBy: { rate: 'desc' },
      select: { rate: true },
    });

    let initialRate = 50; // Valor por defecto si la base está vacía
    if (topPosts.length > 0) {
      const sum = topPosts.reduce((acc, p) => acc + p.rate, 0);
      initialRate = Math.round(sum / topPosts.length / 2);
    }

    const newPost = await this.prisma.posts.create({
      data: {
        text: dto.text ?? null,
        media: mediaUrls.length > 0 ? mediaUrls : Prisma.JsonNull,
        ubication: dto.ubication ?? null,
        isAdd: dto.isAdd ?? false,
        restrictedComments: dto.restrictedComments ?? false,
        sourceIp: clientIp,
        rate: initialRate,
        interactions: 0,
        user: { connect: { id: userFK } },
        ...(dto.eventId && { event: { connect: { id: dto.eventId } } }),
      },
    });

    return {
      message: 'Post created successfully.',
      post: newPost,
    };
  }

  // 2. GET /posts/:id - Detalle de un post
  async findOne(id: number) {
    const post = await this.prisma.posts.findUnique({
      where: { id },
      select: {
        id: true,
        text: true,
        media: true,
        ubication: true,
        isAdd: true,
        likesCount: true,
        sharesCount: true,
        favouritesCount: true,
        commentsCount: true,
        restrictedComments: true,
        interactions: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            verified: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        taggedRel: {
          select: {
            user: {
              select: {
                id: true,
                user: true,
                image: true,
              },
            },
          },
        },
        commentsRel: {
          select: {
            id: true,
            text: true,
            image: true,
            likesCount: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    // Aumentar interacciones asincrónicamente
    await this.prisma.posts.update({
      where: { id },
      data: { interactions: { increment: 1 } },
    });

    return post;
  }

  // 3. GET /posts - Feed paginado ordenado por relevancia e inserciones no tan virales
  async findAll(query: GetPostsDto) {
    const { limit, cursor, order } = query;

    // Obtener posts más relevantes según Rate e Interactions combinados
    const rawPosts = await this.prisma.posts.findMany({
      take: limit + 5,
      where: cursor ? { id: order === 'DESC' ? { lt: cursor } : { gt: cursor } } : {},
      include: {
        user: {
          select: { id: true, name: true, image: true, verified: true },
        },
        event: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { id: order === 'DESC' ? 'desc' : 'asc' },
    });

    // Algoritmo de puntuación: (Rate * 0.7) + (log10(Interactions + 1) * 30)
    const scoredPosts = rawPosts.map((post) => {
      const score =
        post.rate * 0.7 + Math.log10(post.interactions + 1) * 30;
      return { post, score };
    });

    // Ordenar de mayor a menor relevancia
    scoredPosts.sort((a, b) => b.score - a.score);

    // Intercalar un post con rating más bajo cada 5 publicaciones virales
    const resultPosts: any[] = [];
    const mainList = scoredPosts.map((s) => s.post);

    for (let i = 0; i < mainList.length; i++) {
      resultPosts.push(mainList[i]);
      if ((i + 1) % 5 === 0 && i < mainList.length - 1) {
        // Mover el último elemento menos relevante temporalmente aquí
        const lowerPost = mainList.pop();
        if (lowerPost) resultPosts.push(lowerPost);
      }
    }

    const finalFeed = resultPosts.slice(0, limit);

    return {
      message: 'Posts retrieved successfully.',
      posts: finalFeed.map(({ sourceIp, rate, ...rest }) => rest), // Omitir sourceIp y rate
      nextCursor: finalFeed.length > 0 ? finalFeed[finalFeed.length - 1].id : null,
    };
  }

  // 4. PATCH /posts/:id - Actualizar Post
  async update(id: number, dto: UpdatePostDto, userFK: number) {
    const existingPost = await this.prisma.posts.findUnique({ where: { id } });

    if (!existingPost) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    if (existingPost.userFK !== userFK) {
      throw new ForbiddenException('You do not have permission to modify this post.');
    }

    if (dto.eventId) {
      const eventExists = await this.prisma.events.findUnique({
        where: { id: dto.eventId },
      });
      if (!eventExists) {
        throw new NotFoundException(`Event with ID ${dto.eventId} not found.`);
      }
    }

    const updatedPost = await this.prisma.posts.update({
      where: { id },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.ubication !== undefined && { ubication: dto.ubication }),
        ...(dto.eventId && { event: { connect: { id: dto.eventId } } }),
      },
    });

    return {
      message: 'Post updated successfully.',
      post: updatedPost,
    };
  }

  // 5. DELETE /posts/:id - Borrado completo en cascada manual
  async remove(id: number, userFK: number) {
    const existingPost = await this.prisma.posts.findUnique({ where: { id } });

    if (!existingPost) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    if (existingPost.userFK !== userFK) {
      throw new ForbiddenException('You do not have permission to delete this post.');
    }

    // Transacción en Prisma para limpiar dependencias antes de borrar el post
    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({ where: { postFK: id } }),
      this.prisma.tagged.deleteMany({ where: { postFK: id } }),
      this.prisma.postsAnalytics.deleteMany({ where: { postFK: id } }),
      this.prisma.posts.delete({ where: { id } }),
    ]);

    return {
      message: 'Post and all associated resources deleted successfully.',
    };
  }
}