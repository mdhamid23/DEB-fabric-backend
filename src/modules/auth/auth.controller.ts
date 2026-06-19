import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AuthUser } from "@/common/interfaces/auth-user.interface";
import { JwtGuard } from "@/common/guard";
import { Controller, Get, UseGuards } from "@nestjs/common";

@Controller("auth")
export class AuthController {
  @Get("me")
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: AuthUser) {
    return {
      authenticated: true,
      user,
    };
  }
}
