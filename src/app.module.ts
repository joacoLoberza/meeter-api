import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserController } from './Rutas/user.controller';
import { UserService } from './Services/user.service';
import { EventController } from './Rutas/event.controller';
import { EventService } from './Services/event.service';
import { EventCategoriesController } from './Rutas/event-categories.controller';
import { EventCategoriesService } from './Services/event-categories.service';
import { ServiceCategoriesController } from './Rutas/service-categories.controller';
import { ServiceCategoriesService } from './Services/service-categories.service';
import { PrismaService } from './Services/prisma.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [
    UserController,
    EventController,
    EventCategoriesController,
    ServiceCategoriesController,
  ],
  providers: [
    UserService,
    EventService,
    EventCategoriesService,
    ServiceCategoriesService,
    PrismaService,
  ],
})
export class AppModule {}