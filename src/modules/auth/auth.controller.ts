import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from './auth.decorator';
import type { AuthenticatedUser } from './auth.service';

@Controller('api/auth')
export class AuthController {
  @Get('me') me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
