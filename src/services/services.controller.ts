import  { Controller, Param, Query, Body, Delete, Get, Post, Patch, Search } from '@nestjs/common';
import { ServicesService } from './services/services.service';
import GetServicesDto from './dto/getServicesDto';

@Controller('/services')
class ServicesController {
	constructor( private readonly servicesService: ServicesService) {}

	@Get('/')
	findAll(@Query() queryParams: GetServicesDto ) {
		return this.servicesService.findAll(queryParams)
	}

	@Get('/:id')
	findOne() {

	}

	@Post('/')
	create() {

	}

	@Delete('/:id')
	destroy() {

	}

	@Patch('/:id')
	update() {

	}
}