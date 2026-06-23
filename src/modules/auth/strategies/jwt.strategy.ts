import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;        // user id
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.get<string>('JWT_BEARER_SECRET') ?? 'changeme',
    });
  }

  async validate(payload: JwtPayload) {
    // Re-check user is still active on every request
    // This ensures deactivated users can't keep using old JWTs
    const user = await this.usersService.findByIdOrFail(payload.sub);
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account has been deactivated');
    }
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
