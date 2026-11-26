import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../Services/prisma.service'

/**
 * Exige que la cuenta exista y esté verificada en la base de datos.
 *
 * El JWT solo transporta `{ id, role }`, por lo que `verified` NO viene en el
 * token: leerlo desde `request.user` devolvía siempre `undefined` y bloqueaba
 * con 403 todas las rutas protegidas. Ahora se consulta el estado real.
 */
@Injectable()
export class VerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest()

    if (!user) {
      throw new ForbiddenException('No autenticado')
    }

    const userId = Number(user.id ?? user.sub)
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ForbiddenException('Sesión inválida')
    }

    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verified: true },
    })

    if (!account) {
      throw new ForbiddenException('No autenticado')
    }

    if (!account.verified) {
      throw new ForbiddenException('Debes verificar tu cuenta para realizar esta acción')
    }

    return true
  }
}
