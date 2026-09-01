import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecordViewDto } from './dto/recordViewDto.js';

@Injectable()
export class PostsAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Algoritmo para calcular el finalRate de esta interacción
  private calculateFinalRate(dto: RecordViewDto): number {
    let score = 0;

    // Retención e interés (hasta 60 pts)
    score += (dto.completionRate / 100) * 40;
    const dwellScore = Math.min(dto.dwellTime / 10, 1) * 20;
    score += dwellScore;

    // Interacciones activas (hasta 40 pts)
    if (dto.liked) score += 10;
    if (dto.commented) score += 10;
    if (dto.shared) score += 10;
    if (dto.favourite) score += 10;

    // Penalización por falta de interés
    if (dto.notInterested) score -= 50;

    return Math.max(0, Math.round(score));
  }

  async recordView(dto: RecordViewDto, userFK: number) {
    // 1. Verificar existencia del Post
    const post = await this.prisma.posts.findUnique({
      where: { id: dto.postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${dto.postId} not found.`);
    }

    const calculatedFinalRate = this.calculateFinalRate(dto);

    // 2. Transacción: Upsert en Analytics + Incremento de Interactions en el Post
    const [analyticsRecord] = await this.prisma.$transaction([
      // A) Crear o actualizar el registro único (postFK + userFK)
      this.prisma.postsAnalytics.upsert({
        where: {
          postFK_userFK: {
            postFK: dto.postId,
            userFK: userFK,
          },
        },
        update: {
          dwellTime: dto.dwellTime,
          completionRate: dto.completionRate,
          finalRate: calculatedFinalRate,
          ...(dto.liked !== undefined && { liked: dto.liked }),
          ...(dto.commented !== undefined && { commented: dto.commented }),
          ...(dto.shared !== undefined && { shared: dto.shared }),
          ...(dto.favourite !== undefined && { favourite: dto.favourite }),
          ...(dto.notInterested !== undefined && { notInterested: dto.notInterested }),
        },
        create: {
          post: { connect: { id: dto.postId } },
          user: { connect: { id: userFK } },
          dwellTime: dto.dwellTime,
          completionRate: dto.completionRate,
          finalRate: calculatedFinalRate,
          liked: dto.liked ?? false,
          commented: dto.commented ?? false,
          shared: dto.shared ?? false,
          favourite: dto.favourite ?? false,
          notInterested: dto.notInterested ?? false,
        },
      }),

      // B) Incrementar siempre la cantidad de vistas/interacciones globales del post
      this.prisma.posts.update({
        where: { id: dto.postId },
        data: {
          interactions: { increment: 1 },
        },
      }),
    ]);

    // 3. Recalcular y actualizar el Rate global del Post según el promedio acumulado
    const aggregate = await this.prisma.postsAnalytics.aggregate({
      where: { postFK: dto.postId },
      _avg: { finalRate: true },
    });

    if (aggregate._avg.finalRate !== null) {
      await this.prisma.posts.update({
        where: { id: dto.postId },
        data: { rate: Math.round(aggregate._avg.finalRate) },
      });
    }

    return {
      message: 'Post analytics recorded successfully.',
      analytics: analyticsRecord,
    };
  }
}