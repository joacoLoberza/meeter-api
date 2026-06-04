import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { Contrats, ContratsStatus, ContratsPayState } from '@prisma/client';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: any) {}

  async create(createContractDto: CreateContractDto): Promise<Contrats> {
    const { signedAt, status, paymentState, ...rest } = createContractDto;

    const data: any = {
      ...rest,
    };

    if (signedAt) {
      data.signedAt = new Date(signedAt);
    }

    if (status) {
      data.status = status as ContratsStatus;
    }

    if (paymentState) {
      data.paymentState = paymentState as ContratsPayState;
    }

    return this.prisma.contrats.create({
      data,
    });
  }

  async findAll(): Promise<Contrats[]> {
    return this.prisma.contrats.findMany({
      include: {
        event: true,
        service: true,
        organizer: true,
        provider: true,
      },
    });
  }

  async findOne(id: number): Promise<Contrats> {
    const contract = await this.prisma.contrats.findUnique({
      where: { id },
      include: {
        event: true,
        service: true,
        organizer: true,
        provider: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contrato con ID ${id} no encontrado`);
    }

    return contract;
  }

  async update(id: number, updateContractDto: UpdateContractDto): Promise<Contrats> {
    // Verificar si existe el contrato
    await this.findOne(id);

    const { signedAt, status, paymentState, ...rest } = updateContractDto;

    const data: any = {
      ...rest,
    };

    if (signedAt) {
      data.signedAt = new Date(signedAt);
    }

    if (status) {
      data.status = status as ContratsStatus;
    }

    if (paymentState) {
      data.paymentState = paymentState as ContratsPayState;
    }

    return this.prisma.contrats.update({
      where: { id },
      data,
    });
  }

  async remove(id: number): Promise<{ success: boolean }> {
    // Verificar si existe el contrato
    await this.findOne(id);

    await this.prisma.contrats.delete({
      where: { id },
    });

    return { success: true };
  }
}
