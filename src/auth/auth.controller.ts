import { 
  Controller, 
  Post, 
  Body, 
  Headers, 
  HttpStatus, 
  HttpCode,
  BadRequestException 
} from '@nestjs/common';
import { AuthService, ValidationResponse } from './auth.service';

export class ValidateTokenDto {
  token: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  async validateToken(
    @Body() body?: ValidateTokenDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<ValidationResponse> {
    // Get token from body or Authorization header
    let token = body?.token || authHeader;

    if (!token) {
      throw new BadRequestException({
        status: 'Token Invalid',
        message: 'Token is required in request body or Authorization header',
        timestamp: new Date().toISOString(),
      });
    }

    return await this.authService.validateClerkToken(token);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(
    @Headers('authorization') authHeader: string,
  ): Promise<ValidationResponse> {
    if (!authHeader) {
      throw new BadRequestException({
        status: 'Token Invalid',
        message: 'Authorization header is required',
        timestamp: new Date().toISOString(),
      });
    }

    return await this.authService.validateClerkToken(authHeader);
  }
}