import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './createServiceDto';

// PartialType hace que todos los campos de CreateServiceDto sean opcionales (@IsOptional)
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
