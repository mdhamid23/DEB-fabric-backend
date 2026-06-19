import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    // 1. BYPASS if not in Production
    // This allows you to test freely on localhost or dev servers
    if (nodeEnv !== 'production') {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip;
    const whitelistString = this.configService.get<string>('ADMIN_IP_WHITELIST');

    // Fail Safe: If production but no list defined, block everyone to be safe
    if (!whitelistString) {
      this.logger.error('CRITICAL: ADMIN_IP_WHITELIST is missing in production environment');
      throw new ForbiddenException('Server misconfiguration');
    }

    const whitelist = whitelistString.split(',').map(ip => ip.trim());

    if (whitelist.includes(clientIp)) {
      return true;
    }

    this.logger.warn(`BLOCKED: Unauthorized Admin Access Attempt from IP: ${clientIp}`);
    throw new ForbiddenException('Access Denied: Your IP is not authorized.');
  }
}