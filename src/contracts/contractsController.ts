import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ContractsService } from './contractsService';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  async create(@Body() createContractDto: CreateContractDto) {
    return this.contractsService.create(createContractDto);
  }

  @Get()
  async findAll() {
    return this.contractsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contractsService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto) {
    return this.contractsService.update(+id, updateContractDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.contractsService.remove(+id);
  }
}