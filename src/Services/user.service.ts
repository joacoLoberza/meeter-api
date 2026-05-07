import { Injectable, NotFoundException } from '@nestjs/common'
import { User } from '@prisma/client'
import { UpdateUserDto } from '../Rutas/dto/update-user.dto'

/**
 * Propósito y Contexto del UserService
 *
 * El UserService encapsula la lógica de negocio real para la gestión de usuarios.
 * El controlador no accede directamente a la persistencia de datos, sino que
 * delega todo el trabajo a este servicio.
 */
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: any, // Inyección de dependencia de PrismaService o repositorio equivalente.
  ) {}

  /**
   * findAll — Devuelve todos los usuarios con paginación y excluyendo información sensible.
   * En una implementación productiva, se filtran datos sensibles antes de devolverlos.
   */
  async findAll(page: number = 1, limit: number = 20): Promise<Omit<User, 'password' | 'id' | 'cuit' | 'serviceFK'>[]> {
    const skip = (page - 1) * limit;
    const users = await this.prisma.user.findMany({
      take: limit,
      skip: skip,
      select: {
        role: true,
        user: true,
        name: true,
        email: true,
        verified: true,
        image: true,
        dni: true,
        address: true,
        // Excluyendo: id, password, cuit, serviceFK
      },
    });
    return users.map((user: Omit<User, 'password' | 'id' | 'cuit' | 'serviceFK'> & { address?: string | null }) => {
      if (user.role !== 'OFFERER') {
        const { address, ...rest } = user
        return rest
      }
      return user
    })
  }

  /**
   * findOne — Recupera un usuario por su ID.
   * Lanza NotFoundException si no existe el usuario.
   * Excluye password, id y serviceFK.
   */
  async findOne(id: string): Promise<Omit<User, 'password' | 'id' | 'serviceFK'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        role: true,
        user: true,
        name: true,
        email: true,
        verified: true,
        image: true,
        dni: true,
        address: true,
        // Excluyendo: id, password, serviceFK
      },
    })
    if (!user) {
      throw new NotFoundException('Usuario no encontrado')
    }
    if (user.role !== 'OFFERER') {
      const { address, ...result } = user
      return result
    }
    return user
  }

  /**
   * update — Actualiza campos parciales del usuario.
   * Se usa PATCH y campos opcionales en UpdateUserDto.
   */
  async update(id: string, dto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    })
    const { password, ...result } = user
    return result
  }

  /**
   * remove — Elimina el usuario.
   * Puede ser Hard Delete o Soft Delete según la estrategia de negocio.
   */
  async remove(id: string): Promise<{ success: boolean }> {
    await this.prisma.user.delete({ where: { id } })
    return { success: true }
  }
}
