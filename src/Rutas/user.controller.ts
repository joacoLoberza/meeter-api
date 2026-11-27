import { Controller, Get, Post, Param, Patch, Delete, Body, Query, UseGuards, ForbiddenException, ParseIntPipe } from '@nestjs/common'
import { UserService } from '../Services/user.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { VerifiedGuard } from '../auth/guards/verified.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll() {
    return this.userService.findAll()
  }

  /**
   * Lista los amigos (seguimiento mutuo).
   * Ojo: debe declararse antes que `@Get(':id')` para que Express no
   * interprete "friends" como un id.
   */
  @Get('friends')
  @UseGuards(JwtAuthGuard)
  async getFriends(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userService.getFriends(
      Number(user.id ?? user.sub),
      this.toLimit(limit),
      this.toOffset(offset),
    )
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.userService.findOne(id, Number(user.id ?? user.sub))
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  async follow(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.userService.followUser(Number(user.id ?? user.sub), id)
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  async unfollow(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.userService.unfollowUser(Number(user.id ?? user.sub), id)
  }

  @Get(':id/followers')
  @UseGuards(JwtAuthGuard)
  async getFollowers(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userService.getFollowers(id, this.toLimit(limit), this.toOffset(offset))
  }

  @Get(':id/following')
  @UseGuards(JwtAuthGuard)
  async getFollowing(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userService.getFollowing(id, this.toLimit(limit), this.toOffset(offset))
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, VerifiedGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'ADMIN' && String(user.id) !== id) {
      throw new ForbiddenException('No puedes modificar otro usuario')
    }
    return this.userService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== 'ADMIN' && String(user.id) !== id) {
      throw new ForbiddenException('No puedes eliminar otro usuario')
    }
    return this.userService.remove(id)
  }

  /** Normaliza `limit` a un entero entre 1 y 100 (default 50). */
  private toLimit(value?: string): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 50
    return Math.min(Math.max(Math.trunc(parsed), 1), 100)
  }

  /** Normaliza `offset` a un entero >= 0 (default 0). */
  private toOffset(value?: string): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 0
    return Math.max(Math.trunc(parsed), 0)
  }
}
