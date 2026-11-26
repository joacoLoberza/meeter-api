import { CanActivate, ExecutionContext } from '@nestjs/common'
import { JwtAuthGuard } from './jwt-auth.guard'

export class OptionalJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const hasBearerToken = request.headers.authorization?.startsWith('Bearer ')
    const hasCookieToken = Boolean(request.cookies?.token)

    if (!hasBearerToken && !hasCookieToken) {
      return true
    }

    return new JwtAuthGuard().canActivate(context)
  }
}
