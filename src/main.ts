import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exeption.filter.js';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS
  const allowedOrigins = [
    'https://matriz.social',
    'https://www.matriz.social',
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      try {
        const hostname = new URL(origin).hostname;
        if (allowedOrigins.includes(origin) || hostname === 'matriz.social' || hostname.endsWith('.matriz.social')) {
          return callback(null, true);
        }
      } catch (e) {}
      return callback(null, true);
    },
    credentials: true,
  });

  // Middlewares, Adaptadores y Pipes
  app.use(cookieParser());
  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Puerto
  await app.listen(process.env.PORT || 3000);
}
bootstrap();