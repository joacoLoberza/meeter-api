import { IsString, IsOptional } from 'class-validator';

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  text?: string;
}
