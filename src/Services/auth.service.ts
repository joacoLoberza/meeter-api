import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import { JwtService } from './jwt.service'
import { PrismaService } from './prisma.service'
import { EmailService } from './email.service'
import * as bcrypt from 'bcryptjs'

const DEFAULT_USER_IMAGE = 'https://undefined.com'

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client()
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Envía el aviso de ingreso sin bloquear la autenticación: si el servidor
   * de correo falla, se registra el problema pero el login sigue adelante.
   */
  private async notifyLogin(user: { email: string; name: string; user: string }, method: string): Promise<void> {
    if (!user.email) return

    try {
      await this.emailService.sendLoginNotification(user.email, user.name || user.user, method)
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el aviso de ingreso a ${user.email}: ${(error as Error).message}`,
      )
    }
  }

  async register(dto: { user: string; name: string; email: string; password: string; dni?: string; address?: string }) {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ user: dto.user }, { email: dto.email }] },
    })
    if (existingUser) {
      throw new ConflictException('El usuario o email ya existe')
    }

    const hashed = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: {
        user: dto.user,
        name: dto.name,
        email: dto.email,
        password: hashed,
        dni: dto.dni || null,
        address: dto.address || null,
      },
    })

    const token = this.jwtService.sign({ id: user.id, role: user.role })
    const { password, ...userData } = user
    return { token, user: userData }
  }

  async login(dto: { user: string; password: string }) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ user: dto.user }, { email: dto.user }] },
    })
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas')
    }
    if (!user.password) {
      throw new UnauthorizedException('Esta cuenta usa Google. Inicia sesión con Google.')
    }

    const valid = await bcrypt.compare(dto.password, user.password)
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas')
    }

    const token = this.jwtService.sign({ id: user.id, role: user.role })
    const { password, ...userData } = user
    await this.notifyLogin(user, 'tu contraseña')
    return { token, user: userData }
  }

  /**
   * Inicia sesión (o crea la cuenta) a partir de un ID token de Google.
   *
   * El token se verifica contra Google, por lo que no hace falta enviar
   * contraseña ni hacer un proceso de verificación de email propio.
   * Si ya existe una cuenta con el mismo email, se vincula automáticamente.
   */
  async googleLogin(dto: { idToken: string }) {
    const idToken = dto?.idToken?.trim()
    if (!idToken) {
      throw new BadRequestException('El token de Google es obligatorio')
    }

    const audiences = (process.env.GOOGLE_CLIENT_ID ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)

    if (audiences.length === 0) {
      throw new ServiceUnavailableException(
        'Google Sign-In no está configurado en el servidor. Falta GOOGLE_CLIENT_ID.',
      )
    }

    let payload
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      })
      payload = ticket.getPayload()
    } catch {
      throw new UnauthorizedException('El token de Google es inválido o expiró')
    }

    const googleId = payload?.sub?.trim()
    const email = payload?.email?.trim().toLowerCase()

    if (!payload || !googleId || !email) {
      throw new UnauthorizedException('Google no devolvió los datos necesarios')
    }
    if (payload.email_verified !== true) {
      throw new UnauthorizedException('Tu cuenta de Google no tiene el email verificado')
    }

    let user = await this.prisma.user.findUnique({ where: { googleId } })

    if (!user) {
      // El email de Google llega en minúsculas; buscamos sin distinguir
      // mayúsculas para no duplicar cuentas creadas con otro formato.
      const existingByEmail = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      })

      if (existingByEmail) {
        if (existingByEmail.googleId && existingByEmail.googleId !== googleId) {
          throw new ConflictException('Este email ya está vinculado a otra cuenta de Google')
        }

        const picture = payload.picture?.trim()
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId,
            verified: true,
            ...(picture && existingByEmail.image === DEFAULT_USER_IMAGE
              ? { image: picture }
              : {}),
          },
        })
      } else {
        const username = await this.generateUsername(email)
        const picture = payload.picture?.trim()
        user = await this.prisma.user.create({
          data: {
            user: username,
            name: payload.name?.trim() || username,
            email,
            password: null,
            verified: true,
            googleId,
            ...(picture ? { image: picture } : {}),
          },
        })
      }
    }

    const token = this.jwtService.sign({ id: user.id, role: user.role })
    const { password, ...userData } = user
    await this.notifyLogin(user, 'tu cuenta de Google')
    return { token, user: userData }
  }

  /** Genera un nombre de usuario único a partir del email de Google. */
  private async generateUsername(email: string): Promise<string> {
    const localPart = email.split('@')[0] ?? ''
    const base =
      localPart
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
        .slice(0, 24) || 'usuario'

    let candidate = base
    let suffix = 0

    while (await this.prisma.user.findUnique({ where: { user: candidate } })) {
      suffix += 1
      candidate = `${base}${suffix}`
    }

    return candidate
  }
}
