import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const validationResult = await this.authService.validateClerkToken(authHeader);

    if (validationResult.status !== 'Token Valid') {
      throw new UnauthorizedException(validationResult.message);
    }

    // Attach user info to request for use in controllers
    request.user = validationResult.user;
    return true;
  }
}