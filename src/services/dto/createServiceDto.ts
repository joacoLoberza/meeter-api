// src/services/dto/createServiceDto.ts
import {
  IsInt,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ResType {
  HOME = 'HOME',
  NO_HOME = 'NO_HOME',
  CLOUDE = 'CLOUDE',
}

export enum PayType {
  PER_HOUR = 'PER_HOUR',
  PER_SERVICE = 'PER_SERVICE',
  PER_PERSON = 'PER_PERSON',
  PER_UNIT = 'PER_UNIT',
  COMPLETE = 'COMPLETE',
}

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsInt()
  basePrice: number;

  @IsEnum(PayType)
  paymentType: PayType;

  @IsEnum(ResType)
  receptionType: ResType;

  @ValidateIf((o: CreateServiceDto) => o.receptionType === ResType.HOME)
  @IsString()
  @IsNotEmpty()
  ubication?: string;

  @ValidateIf((o: CreateServiceDto) => o.receptionType === ResType.HOME)
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ValidateIf((o: CreateServiceDto) => o.receptionType === ResType.HOME)
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ValidateIf((o: CreateServiceDto) => o.receptionType === ResType.HOME)
  @IsString()
  @IsNotEmpty()
  sourceUbication?: string;

  @ValidateIf((o: CreateServiceDto) => o.receptionType === ResType.HOME)
  @Type(() => Number)
  @IsInt()
  coberRadius?: number;

  @Type(() => Number)
  @IsInt()
  category: number;

  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}