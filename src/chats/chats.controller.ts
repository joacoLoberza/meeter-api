import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatsService } from './chats.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UpdateMessageDto } from './dto/update-message.dto.js';
import { AddMemberDto } from './dto/add-member.dto.js';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // 3.1 POST /chats - Crear chat
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateChatDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.create(dto, userFK, file);
  }

  // 3.4 GET /chats - Obtener chats del usuario autenticado
  @Get()
  async findAllForUser(@Req() req: any) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.findAllForUser(userFK);
  }

  // 3.8 PATCH /chats/messages/:messageId - Editar mensaje
  @Patch('messages/:messageId')
  async updateMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: UpdateMessageDto,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.updateMessage(messageId, dto, userFK);
  }

  // 3.8 DELETE /chats/messages/:messageId - Eliminar mensaje
  @Delete('messages/:messageId')
  async removeMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.removeMessage(messageId, userFK);
  }

  // 3.6 GET /chats/:id/details - Detalles completos del chat
  @Get(':id/details')
  async getDetails(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.getDetails(id, userFK);
  }

  // 3.5 GET /chats/:id - Obtener chat por ID con mensajes
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.findOneWithMessages(id, userFK);
  }

  // 3.2 PATCH /chats/:id - Actualizar chat (Solo Admin)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChatDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.update(id, dto, userFK, file);
  }

  // 3.3 DELETE /chats/:id - Eliminar chat (Solo Admin)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.remove(id, userFK);
  }

  // 3.7 POST /chats/:id/messages - Agregar mensaje a un chat
  @Post(':id/messages')
  @UseInterceptors(FileInterceptor('image'))
  async createMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMessageDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.createMessage(id, dto, userFK, file);
  }

  // 3.9 POST /chats/:id/members - Agregar miembro al chat
  @Post(':id/members')
  async addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMemberDto,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.addMember(id, dto, userFK);
  }

  // 3.9 PATCH /chats/:id/members/:userId/approve - Aprobar nuevo miembro (Solo Admin)
  @Patch(':id/members/:userId/approve')
  async approveMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.approveMember(id, userId, userFK);
  }

  // 3.9 DELETE /chats/:id/members/:userId - Quitar miembro o salir del chat
  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any,
  ) {
    const userFK = req.payload?.id ?? req.payload?.sub ?? 1;
    return this.chatsService.removeMember(id, userId, userFK);
  }
}
