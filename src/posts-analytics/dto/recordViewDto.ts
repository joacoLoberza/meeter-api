import { IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordViewDto {
  @Type(() => Number)
  @IsInt()
  postId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  dwellTime!: number; // Tiempo en segundos o milisegundos

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  completionRate!: number; // Porcentaje de 0 a 100

  @IsOptional()
  @IsBoolean()
  liked?: boolean;

  @IsOptional()
  @IsBoolean()
  commented?: boolean;

  @IsOptional()
  @IsBoolean()
  shared?: boolean;

  @IsOptional()
  @IsBoolean()
  favourite?: boolean;

  @IsOptional()
  @IsBoolean()
  notInterested?: boolean;
}