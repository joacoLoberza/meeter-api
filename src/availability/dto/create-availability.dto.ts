import { IsInt, IsNotEmpty, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAvailabilityDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  serviceId: number;

  @IsDateString()
  @IsNotEmpty()
  initDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
