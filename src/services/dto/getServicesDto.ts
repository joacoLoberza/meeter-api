import { Transform } from "class-transformer";
import { IsOptional, IsInt, IsNumber } from "class-validator";

enum Order {
	ASC = 'ASC',
	DESC = 'DESC',
}

export default class GetServicesDto {
	search?: string = '';

	@IsOptional()
	@Transform(({value}) => parseInt(value, 10))
	@IsInt()
	cursor?: number;
	
	order?: Order = Order.ASC;

	@IsOptional()
	@Transform(({value}) => parseInt(value, 10))
	@IsInt()
	limit?: number = 10;

	@IsOptional()
	@Transform(({value}) => parseInt(value, 10))
	@IsInt()
	rating?: number;

	@IsOptional()
	@Transform(({value}) => parseInt(value, 10))
	@IsInt()
	category?: number;

	//Estas coordenadas deben ser la ubicación del evento.
	@IsOptional()
	@Transform(({value}) => Number(value))
	@IsNumber()
	lat?: number;

	@IsOptional()
	@Transform(({value}) => Number(value))
	@IsNumber()
	lon?: number;
}