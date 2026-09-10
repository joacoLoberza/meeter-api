import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let type = 'INTERNAL_SERVER_ERROR';
    let origin = 'server';
    let message = 'An unexpected error occurred';

    // ----------------------------------------------------
    // 1. Manejo de Errores de Prisma
    // ----------------------------------------------------
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      origin = 'prisma';
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          type = 'DUPLICATE_ENTRY';
          message = `Unique constraint failed on fields: ${((exception.meta?.target as string[]) || []).join(', ')}`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          type = 'RESOURCE_NOT_FOUND';
          message = 'The requested database record was not found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          type = 'FOREIGN_KEY_CONSTRAINT';
          message = 'Foreign key constraint failed';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          type = `PRISMA_ERROR_${exception.code}`;
          message = exception.message.replace(/\n/g, '');
          break;
      }
    } 
    // ----------------------------------------------------
    // 2. Manejo de Excepciones HTTP de NestJS (class-validator, Guards, etc.)
    // ----------------------------------------------------
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      
      origin = 'server';
      type = exception.constructor.name.replace('Exception', '').toUpperCase();

      if (typeof res === 'object' && res !== null) {
        const responseObj = res as Record<string, any>;
        message = Array.isArray(responseObj.message)
          ? responseObj.message.join(', ')
          : responseObj.message || exception.message;
      } else {
        message = res as string;
      }
    } 
    // ----------------------------------------------------
    // 3. Manejo de Errores Específicos por Nombre / Objeto
    // ----------------------------------------------------
    else if (exception instanceof Error) {
      message = exception.message;
      const errName = exception.name;

      // 🔐 Errores de JWT (jsonwebtoken)
      if (errName === 'TokenExpiredError') {
        origin = 'jwt';
        type = 'TOKEN_EXPIRED';
        status = HttpStatus.UNAUTHORIZED;
        message = 'Authentication token has expired';
      } else if (errName === 'JsonWebTokenError') {
        origin = 'jwt';
        type = 'INVALID_TOKEN';
        status = HttpStatus.UNAUTHORIZED;
        message = 'Invalid authentication token';
      } else if (errName === 'NotBeforeError') {
        origin = 'jwt';
        type = 'TOKEN_NOT_ACTIVE';
        status = HttpStatus.UNAUTHORIZED;
        message = 'Token is not active yet';
      }
      // ☁️ Errores de Cloudinary
      else if (
        errName.includes('Cloudinary') ||
        ('http_code' in exception && (exception as any).http_code)
      ) {
        origin = 'cloudinary';
        type = 'MEDIA_UPLOAD_ERROR';
        status = (exception as any).http_code || HttpStatus.BAD_REQUEST;
      }
      // 📁 Errores de Multer
      else if (errName.includes('Multer')) {
        origin = 'multer';
        type = 'FILE_UPLOAD_ERROR';
        status = HttpStatus.BAD_REQUEST;
      }
      // 🌐 Resto de servicios externos o errores nativos
      else {
        origin = 'external_service';
        type = errName.toUpperCase();
      }
    }

    // Respuesta JSON unificada para el Frontend
    response.status(status).json({
      type,
      origin,
      message,
    });
  }
}