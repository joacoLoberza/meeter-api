import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { PrismaService } from './prisma.service'

/** Datos públicos de un usuario, suficientes para las listas del organizador. */
const publicUserSelect = {
	id: true,
	user: true,
	name: true,
	image: true,
	verified: true,
	role: true,
}

export type AccessMode = 'OPEN' | 'WHITELIST' | 'BLACKLIST'
export type AccessType = 'WHITELIST' | 'BLACKLIST'

interface Actor {
	id: number | string
	role?: string
}

/**
 * Gestión ligera del evento por parte del organizador:
 * colaboradores que ayudan a administrarlo y lista blanca/negra de usuarios
 * que pueden reservar acceso.
 *
 * Reglas de permisos:
 * - Organizador (creador) o ADMIN: control total.
 * - Colaborador: puede gestionar invitados y editar el evento, pero NO puede
 *   cambiar colaboradores, listas de acceso ni eliminar el evento.
 */
@Injectable()
export class EventAccessService {
	constructor(private readonly prisma: PrismaService) {}

	private async getEvent(eventId: number) {
		const event = await this.prisma.events.findUnique({
			where: { id: eventId },
			select: { id: true, userFK: true, name: true, accessMode: true },
		})
		if (!event) throw new NotFoundException('Evento no encontrado')
		return event
	}

	/** Verifica que el actor sea el creador del evento o un ADMIN. */
	async assertOwner(eventId: number, actor: Actor) {
		const event = await this.getEvent(eventId)
		if (event.userFK !== Number(actor.id) && actor.role !== 'ADMIN') {
			throw new ForbiddenException('Solo el organizador del evento puede hacer esto')
		}
		return event
	}

	/** Verifica que el actor sea creador, colaborador o ADMIN. */
	async assertManager(eventId: number, actor: Actor) {
		const event = await this.getEvent(eventId)
		if (event.userFK === Number(actor.id) || actor.role === 'ADMIN') return event
		if (!(await this.isCollaborator(eventId, Number(actor.id)))) {
			throw new ForbiddenException('Sólo el organizador o un colaborador pueden hacer esto')
		}
		return event
	}

	/** ¿Es el usuario un colaborador del evento? */
	async isCollaborator(eventId: number, userId: number): Promise<boolean> {
		if (!Number.isInteger(userId) || userId <= 0) return false
		const row = await this.prisma.eventCollaborators.findUnique({
			where: { eventFK_userFK: { eventFK: eventId, userFK: userId } },
			select: { id: true },
		})
		return Boolean(row)
	}

	/**
	 * Decide si `userId` puede registrarse al evento, según el modo de acceso.
	 * El organizador, los colaboradores y los ADMIN siempre pueden entrar.
	 */
	async canRegister(
		eventId: number,
		userId: number,
		callerRole?: string,
	): Promise<{ allowed: boolean; reason?: string }> {
		const event = await this.getEvent(eventId)
		if (event.userFK === userId || callerRole === 'ADMIN') return { allowed: true }
		if (await this.isCollaborator(eventId, userId)) return { allowed: true }

		const mode = String(event.accessMode) as AccessMode
		if (mode === 'OPEN') return { allowed: true }

		const rule = await this.prisma.eventAccessRules.findUnique({
			where: { eventFK_userFK: { eventFK: eventId, userFK: userId } },
			select: { type: true },
		})
		const type = rule ? String(rule.type) : undefined

		if (mode === 'WHITELIST' && type !== 'WHITELIST') {
			return {
				allowed: false,
				reason:
					'Este evento tiene lista blanca: sólo las personas autorizadas por el organizador pueden registrarse.',
			}
		}
		if (mode === 'BLACKLIST' && type === 'BLACKLIST') {
			return {
				allowed: false,
				reason: 'Estás en la lista negra de este evento y no podés registrarte.',
			}
		}
		return { allowed: true }
	}

	async getCollaborators(eventId: number) {
		await this.getEvent(eventId)
		const rows = await this.prisma.eventCollaborators.findMany({
			where: { eventFK: eventId },
			orderBy: { createdAt: 'desc' },
			select: { user: { select: publicUserSelect } },
		})
		return rows.map((row) => row.user)
	}

	async addCollaborator(eventId: number, userId: number) {
		const event = await this.getEvent(eventId)
		this.assertValidUserId(userId)
		if (event.userFK === userId) {
			throw new BadRequestException('El organizador ya gestiona el evento')
		}
		await this.ensureUserExists(userId)
		const existing = await this.prisma.eventCollaborators.findUnique({
			where: { eventFK_userFK: { eventFK: eventId, userFK: userId } },
			select: { id: true },
		})
		if (existing) throw new ConflictException('Ese usuario ya es colaborador del evento')

		await this.prisma.eventCollaborators.create({
			data: { eventFK: eventId, userFK: userId },
		})
		return { message: 'Colaborador agregado al evento', userId }
	}

	async removeCollaborator(eventId: number, userId: number) {
		await this.getEvent(eventId)
		this.assertValidUserId(userId)
		const result = await this.prisma.eventCollaborators.deleteMany({
			where: { eventFK: eventId, userFK: userId },
		})
		if (!result.count) throw new NotFoundException('Ese usuario no es colaborador del evento')
		return { message: 'Colaborador quitado del evento', userId }
	}

	async getAccessRules(eventId: number) {
		const event = await this.getEvent(eventId)
		const entries = await this.prisma.eventAccessRules.findMany({
			where: { eventFK: eventId },
			orderBy: { createdAt: 'desc' },
			select: { type: true, user: { select: publicUserSelect } },
		})
		return {
			mode: String(event.accessMode),
			whitelist: entries.filter((e) => String(e.type) === 'WHITELIST').map((e) => e.user),
			blacklist: entries.filter((e) => String(e.type) === 'BLACKLIST').map((e) => e.user),
		}
	}

	async setMode(eventId: number, mode: AccessMode) {
		await this.getEvent(eventId)
		await this.prisma.events.update({
			where: { id: eventId },
			data: { accessMode: mode as any },
		})
		return { mode }
	}

	async addAccessRule(eventId: number, userId: number, type: AccessType) {
		const event = await this.getEvent(eventId)
		this.assertValidUserId(userId)
		if (event.userFK === userId) {
			throw new BadRequestException('El organizador no puede estar en las listas de acceso')
		}
		await this.ensureUserExists(userId)

		// Un usuario tiene una sola entrada por evento: cambiar de lista
		// (blanca -> negra o viceversa) actualiza la fila existente.
		await this.prisma.eventAccessRules.upsert({
			where: { eventFK_userFK: { eventFK: eventId, userFK: userId } },
			update: { type: type as any },
			create: { eventFK: eventId, userFK: userId, type: type as any },
		})
		return { userId, type }
	}

	async removeAccessRule(eventId: number, userId: number) {
		await this.getEvent(eventId)
		this.assertValidUserId(userId)
		await this.prisma.eventAccessRules.deleteMany({
			where: { eventFK: eventId, userFK: userId },
		})
		return { userId }
	}

	private assertValidUserId(userId: number) {
		if (!Number.isInteger(userId) || userId <= 0) {
			throw new BadRequestException('El ID del usuario no es válido')
		}
	}

	private async ensureUserExists(userId: number) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { id: true },
		})
		if (!user) throw new NotFoundException('Usuario no encontrado')
	}
}
