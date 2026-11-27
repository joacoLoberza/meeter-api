import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	ParseIntPipe,
	UseGuards,
} from '@nestjs/common'
import { EventAccessService } from '../Services/event-access.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { VerifiedGuard } from '../auth/guards/verified.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import {
	AccessRuleDto,
	SetAccessModeDto,
	UserIdDto,
} from './dto/event-access.dto'

/**
 * Gestión ligera del organizador: colaboradores y lista blanca/negra.
 * Se declara antes que `EventController` en AppModule para evitar cualquier
 * ambigüedad con `@Get(':id')`.
 */
@Controller('events')
@UseGuards(JwtAuthGuard, VerifiedGuard)
export class EventAccessController {
	constructor(private readonly eventAccess: EventAccessService) {}

	// --- Colaboradores -------------------------------------------------------

	@Get(':id/collaborators')
	async getCollaborators(
		@Param('id', ParseIntPipe) id: number,
		@CurrentUser() user: any,
	) {
		await this.eventAccess.assertManager(id, user)
		return { data: await this.eventAccess.getCollaborators(id) }
	}

	@Post(':id/collaborators')
	async addCollaborator(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UserIdDto,
		@CurrentUser() user: any,
	) {
		await this.eventAccess.assertOwner(id, user)
		return this.eventAccess.addCollaborator(id, dto.userId)
	}

	@Delete(':id/collaborators/:userId')
	async removeCollaborator(
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number,
		@CurrentUser() user: any,
	) {
		await this.eventAccess.assertOwner(id, user)
		return this.eventAccess.removeCollaborator(id, userId)
	}

	// --- Lista blanca / negra ------------------------------------------------

	@Get(':id/access-rules')
	async getAccessRules(
		@Param('id', ParseIntPipe) id: number,
		@CurrentUser() user: any,
	) {
		await this.eventAccess.assertManager(id, user)
		return this.eventAccess.getAccessRules(id)
	}

	@Patch(':id/access-rules')
	async setMode(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: SetAccessModeDto,
		@CurrentUser() user: any,
	) {
		await this.eventAccess.assertOwner(id, user)
		return this.eventAccess.setMode(id, dto.mode)
	}

	@Post(':id/access-rules')
	async addAccessRule(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: AccessRuleDto,
		@CurrentUser() user: any,
	) {
		await this.eventAccess.assertOwner(id, user)
		return this.eventAccess.addAccessRule(id, dto.userId, dto.type)
	}

	@Delete(':id/access-rules/:userId')
	async removeAccessRule(
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number,
		@CurrentUser() user: any,
	) {
		await this.eventAccess.assertOwner(id, user)
		return this.eventAccess.removeAccessRule(id, userId)
	}
}
