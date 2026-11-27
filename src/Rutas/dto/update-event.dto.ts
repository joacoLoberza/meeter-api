import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, Min, Max } from 'class-validator'
import { Transform, Type } from 'class-transformer'

/** Convierte a número sólo si viene informado (si no, lo deja undefined). */
const optionalNumber = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? value : parsed
}

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
  @Transform(optionalNumber)
  @IsNumber()
  categoryFK?: number

  @IsOptional()
  @Transform(optionalNumber)
  @IsNumber()
  @Min(0)
  ticketPrice?: number
}
