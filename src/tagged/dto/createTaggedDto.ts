import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaggedDto {
  @Type(() => Number)
  @IsInt()
  postId!: number;

  @Type(() => Number)
  @IsInt()
  userId!: number; // ID del usuario que se va a etiquetar
}