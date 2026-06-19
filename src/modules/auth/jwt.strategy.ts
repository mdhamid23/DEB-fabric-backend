import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { passportJwtSecret } from "jwks-rsa";
import { AuthUser } from "@/common/interfaces/auth-user.interface";

type JwtPayload = {
  sub?: string | number;
  id?: string | number;
  username?: string;
  email?: string;
  roles?: unknown;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(configService: ConfigService) {
    const jwksUri = configService.get<string>(
      "AUTH_SERVER_JWKS_URI",
      "http://localhost:9000/oauth2/jwks",
    );
    const issuer = configService.get<string>(
      "AUTH_SERVER_ISSUER",
      "http://localhost:9000",
    );
    const audience = configService.get<string>("AUTH_SERVER_AUDIENCE");

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ["RS256"],
      issuer,
      audience,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 60 * 60 * 1000,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    const sub = String(payload.sub ?? payload.id ?? "").trim();
    if (!sub) {
      throw new UnauthorizedException("Invalid access token payload");
    }

    return {
      id: sub,
      username: payload.username || "",
      email: payload.email || "",
      roles: Array.isArray(payload.roles)
        ? payload.roles.filter(
            (role): role is string => typeof role === "string",
          )
        : [],
    };
  }
}
