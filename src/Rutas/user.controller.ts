import { Controller, Get, Param, Patch, Delete, Body, UseGuards } from '@nestjs/common'
import { UserService } from '../Services/user.service'
import { UpdateUserDto } from './dto/update-user.dto'

/**
 * Propósito y Contexto del UserController
 *
 * El UserController es responsable del ciclo de vida de los usuarios registrados.
 * A diferencia del AuthController, que maneja registro e inicio de sesión, este
 * controlador expone rutas para administración y gestión de perfil personal.
 */
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * findAll — GET /users
   * Requiere autorización administrativa y devuelve usuarios sin datos sensibles.
   */
  @Get()
  @UseGuards() // Reemplazar con JwtAuthGuard y RolesGuard(ADMIN) en la implementación real.
  async findAll() {
    return this.userService.findAll()
  }

  /**
   * findOne — GET /users/:id
   * Valida el ID de la ruta y devuelve el perfil público del usuario.
   */
  @Get(':id')
  @UseGuards() // Reemplazar con protección JWT y validación de roles o propietario.
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id)
  }

  /**
   * update — PATCH /users/:id
   * Actualización parcial usando un DTO con campos opcionales.
   * Solo el usuario propietario o un administrador debe poder ejecutar esta acción.
   */
  @Patch(':id')
  @UseGuards() // Reemplazar con JwtAuthGuard y regla de autorización de propietario.
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto)
  }

  /**
   * delete — DELETE /users/:id
   * Invoca la remoción de la cuenta y confirma el éxito.
   */
  @Delete(':id')
  @UseGuards() // Reemplazar con JwtAuthGuard y RolesGuard o permiso de propietario.
  async remove(@Param('id') id: string) {
    return this.userService.remove(id)
  }
}
