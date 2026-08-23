import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";
import GetServicesDto from "./dto/getServicesDto.js";
import { CreateServiceDto } from "./dto/createServiceDto.js";
import { UpdateServiceDto } from "./dto/updateServiceDto.js";

import { Prisma } from "@prisma/client";

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(data: GetServicesDto) {
    const whereConditions: Prisma.Sql[] = [];

    // Filtro obligatorio para ignorar registros eliminados (Soft Delete)
    whereConditions.push(Prisma.sql` "Services"."deletedAt" IS NULL `);

    // Paginación por cursor
    const operator = data.order === 'DESC' ? Prisma.raw('<') : Prisma.raw('>');
    whereConditions.push(Prisma.sql` "Services"."id" ${operator} ${data.cursor} `);

    // Filtro por rating
    if (data.rating) {
      whereConditions.push(Prisma.sql` "Services"."rating" >= ${data.rating} `);
    }

    // Filtro por búsqueda de texto
    if (data.search) {
      const searchPattern = `%${data.search}%`;
      whereConditions.push(
        Prisma.sql` ("Services"."name" ILIKE ${searchPattern} OR "Services"."description" ILIKE ${searchPattern}) `
      );
    }

    // Filtro por categoría
    if (data.category) {
      whereConditions.push(Prisma.sql` "Cat"."id" = ${data.category} `);
    }

    // Filtro por geolocalización (si viene lat y lon)
    if (data.lat !== undefined && data.lon !== undefined) {
      whereConditions.push(
        Prisma.sql` (
          "Services"."receptionType" != 'HOME' OR
          earth_distance(
            ll_to_earth("Services"."latitude", "Services"."longitude"),
            ll_to_earth(${data.lat}, ${data.lon})
          ) <= "Services"."coberRadius" * 1000
        ) `
      );
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`;
    const orderDirection = data.order === 'DESC' ? Prisma.raw('DESC') : Prisma.raw('ASC');

    const services: any[] = await this.prisma.$queryRaw`
      SELECT 
        "Services"."id" AS "servicesId",
        "Services"."image" AS "servicesImage",
        "Services"."name" AS "servicesName",
        "Services"."basePrice" AS "servicesBasePrice",
        "Services"."rating" AS "servicesRating",
        "User"."name" AS "userName",
        "Cat"."name" AS "catName"
      FROM "Services"
      INNER JOIN "User" ON "Services"."userFK" = "User"."id"
      INNER JOIN "ServicesCategories" AS "Cat" ON "Services"."categoryFK" = "Cat"."id"
      ${whereClause}
      ORDER BY "Services"."id" ${orderDirection}
      LIMIT ${data.limit}
    `;

    return {
      message: "Services got successfully.",
      services: services.map((serv) => ({
        id: serv.servicesId,
        image: serv.servicesImage,
        name: serv.servicesName,
        basePrice: serv.servicesBasePrice,
        rating: serv.servicesRating,
        user: serv.userName,
        category: serv.catName,
      })),
      nextCursor: services.length > 0 ? services[services.length - 1].servicesId : null,
    };
  }

  async findOne(id: number) {
    const service = await this.prisma.services.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        paymentType: true,
        receptionType: true,
        image: true,
        ubication: true,
        sourceUbication: true,
        coberRadius: true,
        rating: true,
        details: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, name: true },
        },
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async create(dto: CreateServiceDto, providerId: number, imageBuffer?: Buffer) {
    let imageUrl = 'https://undefined.com'; // Imagen por default

    if (imageBuffer) {
      const uploadResult = await this.cloudinaryService.uploadImage(imageBuffer, 'services');
      imageUrl = uploadResult.secure_url;
    }

    try {
      const newService = await this.prisma.services.create({
        data: {
          name: dto.name,
          description: dto.description,
          basePrice: dto.basePrice,
          paymentType: dto.paymentType,
          receptionType: dto.receptionType,
          image: imageUrl,
          ubication: dto.ubication ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          sourceUbication: dto.sourceUbication ?? null,
          coberRadius: dto.coberRadius ?? 0,
          details: dto.details ? (dto.details as Prisma.InputJsonValue) : Prisma.JsonNull,
          provider: {
            connect: { id: providerId },
          },
          category: {
            connect: { id: dto.category },
          },
        },
      });

      return {
        message: 'Service created successfully.',
        service: newService,
      };
    } catch (error: any) {
      throw new BadRequestException('Could not create service: ' + error.message);
    }
  }

  async update(
    id: number,
    dto: UpdateServiceDto,
    providerId: number,
    imageBuffer?: Buffer,
  ) {
    // Verificar que el servicio existe y pertenece al proveedor usando userFK
    const existingService = await this.prisma.services.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingService) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    if (existingService.userFK !== providerId) {
      throw new ForbiddenException('You do not have permission to modify this service');
    }

    let imageUrl = existingService.image;
    if (imageBuffer) {
      const uploadResult = await this.cloudinaryService.uploadImage(imageBuffer, 'services');
      imageUrl = uploadResult.secure_url;
    }

    // Preparar objeto de actualización omitiendo id, userFK y rating
    const dataToUpdate = {
      ...(dto.name && { name: dto.name }),
      ...(dto.description && { description: dto.description }),
      ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
      ...(dto.paymentType && { paymentType: dto.paymentType }),
      ...(dto.receptionType && { receptionType: dto.receptionType }),
      ...(dto.ubication !== undefined && { ubication: dto.ubication }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      ...(dto.sourceUbication !== undefined && { sourceUbication: dto.sourceUbication }),
      ...(dto.coberRadius !== undefined && { coberRadius: dto.coberRadius }),
      ...(dto.details !== undefined && {
        details: dto.details ? (dto.details as Prisma.InputJsonValue) : Prisma.JsonNull,
      }),
      image: imageUrl,
      ...(dto.category && {
        category: { connect: { id: dto.category } },
      }),
    };

    const updatedService = await this.prisma.services.update({
      where: { id },
      data: dataToUpdate,
    });

    return {
      message: 'Service updated successfully.',
      service: updatedService,
    };
  }

  async remove(id: number, providerId: number) {
    const existingService = await this.prisma.services.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingService) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    if (existingService.userFK !== providerId) {
      throw new ForbiddenException('You do not have permission to delete this service');
    }

    await this.prisma.services.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Service deleted successfully.',
    };
  }
}