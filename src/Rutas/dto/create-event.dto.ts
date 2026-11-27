import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'

/** Convierte a número sólo si viene informado (si no, lo deja undefined). */
const optionalNumber = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? value : parsed
}

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

  /** Opcional: si no se manda, el backend usa la primera categoría disponible. */
  @IsOptional()
  @Transform(optionalNumber)
  @IsNumber()
  categoryFK?: number

  /** Opcional: si no se manda, el evento es gratuito (0). */
  @IsOptional()
  @Transform(optionalNumber)
  @IsNumber()
  @Min(0)
  ticketPrice?: number

  @IsOptional()
  @IsBoolean()
  open?: boolean
}
