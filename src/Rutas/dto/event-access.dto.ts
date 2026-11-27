import { Type } from 'class-transformer'
import { IsEnum, IsInt, Min } from 'class-validator'

export enum AccessModeDto {
	OPEN = 'OPEN',
	WHITELIST = 'WHITELIST',
	BLACKLIST = 'BLACKLIST',
}

export enum AccessTypeDto {
	WHITELIST = 'WHITELIST',
	BLACKLIST = 'BLACKLIST',
}

/** Body compartido por los endpoints que reciben un usuario (`userId`). */
export class UserIdDto {
	@Type(() => Number)
	@IsInt()
	@Min(1)
	userId!: number
}

export class SetAccessModeDto {
	@IsEnum(AccessModeDto)
	mode!: AccessModeDto
}

export class AccessRuleDto extends UserIdDto {
	@IsEnum(AccessTypeDto)
	type!: AccessTypeDto
}
