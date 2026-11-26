import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsDateString()
  initDate?: string

  @IsOptional()
  @IsDateString()
  endingDate?: string

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number

  @IsOptional()
  @IsBoolean()
  open?: boolean

  @IsOptional()
  @IsNumber()
  categoryFK?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  ticketPrice?: number
}
