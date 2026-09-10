import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaggedDto } from './dto/createTaggedDto.js';

@Injectable()
export class TaggedService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Crear etiqueta
  async create(dto: CreateTaggedDto, currentUserFK: number) {
    // Validar existencia del post
    const post = await this.prisma.posts.findUnique({
      where: { id: dto.postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${dto.postId} not found.`);
    }

    // Validar existencia del usuario a etiquetar
    const userToTag = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!userToTag) {
      throw new NotFoundException(`User with ID ${dto.userId} not found.`);
    }

    // Verificar si ya está etiquetado en ese post
    const existingTag = await this.prisma.tagged.findFirst({
      where: {
        postFK: dto.postId,
        userFK: dto.userId,
      },
    });

    if (existingTag) {
      throw new ConflictException('User is already tagged in this post.');
    }

    const newTag = await this.prisma.tagged.create({
      data: {
        post: { connect: { id: dto.postId } },
        user: { connect: { id: dto.userId } },
      },
    });

    return {
      message: 'User tagged successfully.',
      tagged: newTag,
    };
  }

  // 2. Eliminar etiqueta por su ID
  async remove(id: number, currentUserFK: number) {
    const existingTag = await this.prisma.tagged.findUnique({
      where: { id },
      include: { post: true },
    });

    if (!existingTag) {
      throw new NotFoundException(`Tag with ID ${id} not found.`);
    }

    // Permitir borrar la etiqueta solo si sos el dueño del post o el usuario etiquetado
    if (
      existingTag.post.userFK !== currentUserFK &&
      existingTag.userFK !== currentUserFK
    ) {
      throw new ForbiddenException(
        'You do not have permission to remove this tag.',
      );
    }

    await this.prisma.tagged.delete({
      where: { id },
    });

    return {
      message: 'Tag removed successfully.',
    };
  }
}