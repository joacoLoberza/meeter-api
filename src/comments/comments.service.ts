import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { CreateCommentDto } from './dto/createCommentDto.js';
import { UpdateCommentDto } from './dto/updateCommentDto.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

	// Extrae el public_id de Cloudinary desde una URL pública
  private extractPublicId(url: string): string | null {
    try {
      const parts = url.split('/');
      const filename = parts.pop();
      const folder = parts.pop();
      if (!filename || !folder) return null;
      const publicId = filename.split('.')[0];
      return `${folder}/${publicId}`;
    } catch {
      return null;
    }
  }

  // 1. Crear comentario
  async create(
    dto: CreateCommentDto,
    userFK: number,
    file?: Express.Multer.File,
  ) {
    if (!dto.text && !file) {
      throw new BadRequestException(
        'Comment must contain either text or an image.',
      );
    }

    const post = await this.prisma.posts.findUnique({
      where: { id: dto.postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${dto.postId} not found.`);
    }

    if (post.restrictedComments) {
      throw new ForbiddenException('Comments are disabled for this post.');
    }

    let imageUrl: string | null = null;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file.buffer,
        'comments',
      );
      imageUrl = uploadResult.secure_url;
    }

    const [newComment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          text: dto.text ?? null,
          image: imageUrl,
          createdAt: new Date(),
          post: { connect: { id: dto.postId } },
          user: { connect: { id: userFK } },
        },
      }),
      this.prisma.posts.update({
        where: { id: dto.postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return {
      message: 'Comment created successfully.',
      comment: newComment,
    };
  }

  // 2. Actualizar comentario
  async update(
    id: number,
    dto: UpdateCommentDto,
    userFK: number,
    file?: Express.Multer.File,
  ) {
    const existingComment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException(`Comment with ID ${id} not found.`);
    }

    if (existingComment.userFK !== userFK) {
      throw new ForbiddenException(
        'You do not have permission to update this comment.',
      );
    }

    let imageUrl = existingComment.image;
    if (file) {
      // Si ya tenía una imagen previa, la eliminamos de Cloudinary
      if (existingComment.image) {
        const publicId = this.extractPublicId(existingComment.image);
        if (publicId) {
          await this.cloudinaryService.deleteImage(publicId);
        }
      }

      // Subimos la nueva imagen
      const uploadResult = await this.cloudinaryService.uploadImage(
        file.buffer,
        'comments',
      );
      imageUrl = uploadResult.secure_url;
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        image: imageUrl,
      },
    });

    return {
      message: 'Comment updated successfully.',
      comment: updatedComment,
    };
  }

  // 3. Eliminar comentario
  async remove(id: number, userFK: number) {
    const existingComment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException(`Comment with ID ${id} not found.`);
    }

    if (existingComment.userFK !== userFK) {
      throw new ForbiddenException(
        'You do not have permission to delete this comment.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.comment.delete({ where: { id } }),
      this.prisma.posts.update({
        where: { id: existingComment.postFK },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);

		// Eliminar imagen de Cloudinary si el comentario tenía una
    if (existingComment.image) {
      const publicId = this.extractPublicId(existingComment.image);
      if (publicId) {
        await this.cloudinaryService.deleteImage(publicId);
      }
    }

    return {
      message: 'Comment deleted successfully.',
    };
  }

  // 4. Agregar Like a un comentario
  async likeComment(commentId: number, userFK: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }

    const existingLike = await this.prisma.commentLikes.findFirst({
      where: { commentFK: commentId, userFK },
    });

    if (existingLike) {
      throw new ConflictException('You already liked this comment.');
    }

    await this.prisma.$transaction([
      this.prisma.commentLikes.create({
        data: {
          comment: { connect: { id: commentId } },
          user: { connect: { id: userFK } },
        },
      }),
      this.prisma.comment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return {
      message: 'Comment liked successfully.',
    };
  }

  // 5. Quitar Like de un comentario
  async unlikeComment(commentId: number, userFK: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }

    const existingLike = await this.prisma.commentLikes.findFirst({
      where: { commentFK: commentId, userFK },
    });

    if (!existingLike) {
      throw new NotFoundException('Like record not found.');
    }

    await this.prisma.$transaction([
      this.prisma.commentLikes.delete({
        where: { id: existingLike.id },
      }),
      this.prisma.comment.update({
        where: { id: commentId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return {
      message: 'Comment unliked successfully.',
    };
  }
}