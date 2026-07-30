import { Transform } from "class-transformer";
import { IsOptional, IsInt, IsPort } from "class-validator";

enum Order {
	ASC = 'ASC',
	DESC = 'DESC',
}

export default class GetServicesDto {
	search?: string;

	@IsOptional()
	@Transform(({value}) => parseInt(value, 10))
	@IsInt()
	cursor?: string;
	
	order?: Order;

	@IsOptional()
	@Transform(({value}) => parseInt(value, 10))
	@IsInt()
	limit?: string;

	@IsOptional()
	@Transform(({value}) => parseInt(value, 10))
	@IsInt()
	rating?: string;

	@IsOptional()
	@Transform(({value}) => parseInt(value, 10))
	@IsInt()
	category?: string;

	//Estas coordenadas deben ser la ubicación del evento.
	@IsOptional()
	@Transform(({value}) => Number(value))
	@IsInt()
	lat?: string;

	@IsOptional()
	@Transform(({value}) => Number(value))
	@IsInt()
	lon?: string;
}