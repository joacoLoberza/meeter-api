import { IsInt, IsNotEmpty, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceRatingDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  serviceId: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(10)
  rate: number;
}
