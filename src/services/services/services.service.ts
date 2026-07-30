import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import GetServicesDto from "../dto/getServicesDto";
import { Prisma } from "@prisma/client";

@Injectable()
export class ServicesService {
	constructor(private prisma: PrismaService) {}

	async findAll(data: GetServicesDto) {

		const services: Array = this.prisma.$queryRaw`
			SELECT 
				"Services"."id",
				"Services"."image",
				"Services"."name",
				"Services"."basePrice",
				"Services"."rating",
				"User"."name",
				"Cat"."name"
			FROM "Services"
			INNER JOIN "User" ON "Services"."userFk" = "User"."id"
			INNER JOIN "ServicesCategories" AS "Cat" ON "Services"."categoryFk" = "Cat"."id"
			WHERE
				"Services"."id" ${data.order === 'DESC'? Prisma.raw('<') : Prisma.raw('>')} ${data.cursor} AND
				"Services"."rating" >= ${data.rating} AND
				(
					"Services"."name" ILIKE ${`%${data.search}%`} OR
					"Services"."description" ILIKE ${`%${data.search}%`}
				) AND
				"Cat.id" = ${data.category} AND
				(
					"Services"."receptionType" != 'HOME' OR
					earth_distance(
						ll_to_earth("Services"."latitude","Services"."longitude"),
						ll_to_earth(${data.lat},${data.lon})
					)
				)
			ORDER BY "Services"."id" ${data.order? Prisma.raw(data.order) : Prisma.raw('ASC')}
			LIMIT ${data.limit} 
		`;

		return {
			message: "Services got successfully.",
			services,
			nextCursor: services.length > 0? services[services.length].id : null,
		}
	}
}