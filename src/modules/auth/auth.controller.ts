import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Public endpoint — no JWT required.
   *
   * Flow:
   *   1. Validates username + password (PostgreSQL)
   *   2. Enrolls identity in Fabric CA
   *   3. Stores encrypted cert+key in PostgreSQL
   *   4. Returns JWT
   *
   * Response:
   *   { accessToken, user: { id, username, role } }
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ValidationPipe()) dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /auth/me
   * Protected — requires valid JWT.
   * Returns current user profile (no sensitive fields).
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
