import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService], // 👈 Exportamos el servicio para que otros módulos puedan inyectarlo
})
export class CloudinaryModule {}
