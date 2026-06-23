import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class QrCodeService {
  constructor(private jwtService: JwtService) {}

  generateQrToken(
    payload: any,
    options?: { expiresIn?: string | number },
  ): string {
    const signOptions: any = {
      secret: process.env.QR_SECRET,
    };

    // Only add expiration if explicitly provided
    if (options?.expiresIn) {
      signOptions.expiresIn = options.expiresIn;
    }

    return this.jwtService.sign(
      {
        data: payload,
        purpose: "qr-code",
      },
      signOptions,
    );
  }

  decodeQrToken(token: string): any {
    try {
      // Verify without expiration check
      const decoded = this.jwtService.verify(token, {
        secret: process.env.QR_SECRET,
        ignoreExpiration: false, // Still checks expiration if present
      });
      return decoded.data;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new UnauthorizedException("QR token has expired");
      }
      throw new UnauthorizedException("Invalid QR token");
    }
  }
}
