import { IsString, IsOptional, IsNumber, IsDateString, Min, Max, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateEventDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsDateString()
  initDate!: string

  @IsOptional()
  @IsDateString()
  endingDate?: string

  @IsString()
  location!: string

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

  @IsNumber()
  categoryFK!: number

  @IsNumber()
  @Min(0)
  ticketPrice!: number

  @IsOptional()
  @IsBoolean()
  open?: boolean
}
