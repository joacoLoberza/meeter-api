import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  ubication?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  eventId?: number;
}