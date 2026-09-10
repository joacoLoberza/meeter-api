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
      const sum = topPosts.reduce((acc: any, p: any) => acc + p.rate, 0);
      initialRate = Math.round(sum / topPosts.length / 2);
    }

    const newPost = await this.prisma.posts.create({
      data: {
        text: dto.text ?? null,
        media: mediaUrls.length > 0 ? mediaUrls : Prisma.JsonNull,
        ubication: dto.ubication ?? null,
        isAdd: dto.isAdd ?? false,
        restrictedComments: dto.restrictedComments ?? false,
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

// 2. GET /posts/:id - Detalle de un post con el estado de interacción del usuario
  async findOne(id: number, userId?: number) {
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
        // Filtrar analytics solo para el usuario que hace la petición
        ...(userId && {
          postsAnalyticsRel: {
            where: { userFK: userId },
            select: {
              liked: true,
              favourite: true,
            },
          },
        }),
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    // Formatear para devolver userInteraction limpia (o defaults en false)
    const { postsAnalyticsRel, ...postData } = post as any;
    const userAnalytics = postsAnalyticsRel?.[0];

    return {
      ...postData,
      userInteraction: {
        liked: userAnalytics?.liked ?? false,
        favourite: userAnalytics?.favourite ?? false,
      },
    };
  }

  // 3. GET /posts - Feed paginado con selección específica de campos e interacciones del usuario
  async findAll(query: GetPostsDto, userId?: number) {
    const { limit, cursor, order } = query;

    const rawPosts = await this.prisma.posts.findMany({
      take: limit + 5,
      where: cursor ? { id: order === 'DESC' ? { lt: cursor } : { gt: cursor } } : {},
      select: {
        id: true,
        text: true,
        media: true,
        likesCount: true,
        commentsCount: true,
        favouritesCount: true,
        sharesCount: true,
        isAdd: true,
        interactions: true,
        rate: true,
        user: {
          select: { id: true, name: true, image: true, verified: true },
        },
        event: {
          select: { id: true, name: true, image: true },
        },
        ...(userId && {
          postsAnalyticsRel: {
            where: { userFK: userId },
            select: {
              liked: true,
              favourite: true,
            },
          },
        }),
      },
      orderBy: { id: order === 'DESC' ? 'desc' : 'asc' },
    });

    // Algoritmo de puntuación
    const scoredPosts = rawPosts.map((post: any) => {
      const score = post.rate * 0.7 + Math.log10(post.interactions + 1) * 30;
      return { post, score };
    });

    scoredPosts.sort((a, b) => b.score - a.score);

    // Intercalar publicaciones menos virales cada 5
    const resultPosts: any[] = [];
    const mainList = scoredPosts.map((s: any) => s.post);

    for (let i = 0; i < mainList.length; i++) {
      resultPosts.push(mainList[i]);
      if ((i + 1) % 5 === 0 && i < mainList.length - 1) {
        const lowerPost = mainList.pop();
        if (lowerPost) resultPosts.push(lowerPost);
      }
    }

    const finalFeed = resultPosts.slice(0, limit);

    // Formatear respuesta suprimiendo rate y aplanando userInteraction
    const formattedPosts = finalFeed.map(({ rate, postsAnalyticsRel, ...post }) => {
      const userAnalytics = postsAnalyticsRel?.[0];
      return {
        ...post,
        userInteraction: {
          liked: userAnalytics?.liked ?? false,
          favourite: userAnalytics?.favourite ?? false,
        },
      };
    });

    return {
      message: 'Posts retrieved successfully.',
      posts: formattedPosts,
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