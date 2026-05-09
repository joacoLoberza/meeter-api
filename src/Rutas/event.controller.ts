import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { EventService } from '../Services/event.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UseGuards() // Reemplazar con JwtAuthGuard en la implementación real.
  async create(@Body() dto: CreateEventDto, @Req() req: Request) {
    const userId = (req as any).user?.id ?? (req as any).user?.sub
    return this.eventService.create(dto, String(userId))
  }

  @Get()
  async findAll(@Query() query: Record<string, any>) {
    return this.eventService.findAll(query)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.id ?? (req as any).user?.sub
    return this.eventService.findOne(id, userId ? String(userId) : undefined)
  }

  @Patch(':id')
  @UseGuards() // Reemplazar con JwtAuthGuard y autorización de propietario.
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto, @Req() req: Request) {
    const userId = (req as any).user?.id ?? (req as any).user?.sub
    return this.eventService.update(id, dto, String(userId))
  }

  @Delete(':id')
  @UseGuards() // Reemplazar con JwtAuthGuard y autorización de propietario.
  async remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.id ?? (req as any).user?.sub
    return this.eventService.remove(id, String(userId))
  }
}
