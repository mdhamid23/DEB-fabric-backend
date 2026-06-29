import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { CertificatesService } from "./certificates.service";
import { IssueCertificateDto } from "./dto/issue-certificate.dto";
import { RevokeCertificateDto } from "./dto/revoke-certificate.dto";
import { ManualVerifyCertificateDto } from "./dto/manual-verify-certificate.dto";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/entities/user.entity";
import { BulkIssueCertificateDto } from "./dto/bulk-upload.dto";

@Controller("certificates")
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Post()
  async issue(@Body(new ValidationPipe()) dto: IssueCertificateDto) {
    return await this.certificatesService.issue(dto);
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPERADMIN)
  @Post("bulk")
  async bulkIssue(@Body() body: any) {
    console.log("Bulk issue request received:", body);

    // Handle both formats: direct array or object with certificates property
    let certificates: IssueCertificateDto[];

    if (Array.isArray(body)) {
      // If the body is directly an array
      certificates = body;
    } else if (body.certificates && Array.isArray(body.certificates)) {
      // If the body has a certificates property
      certificates = body.certificates;
    } else {
      throw new BadRequestException(
        "Invalid request format. Expected an array of certificates or an object with a certificates property.",
      );
    }

    const dto = new BulkIssueCertificateDto();
    dto.certificates = certificates;

    return await this.certificatesService.bulkIssue(dto);
  }

  @Get()
  async getAll() {
    return this.certificatesService.getAll();
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    return this.certificatesService.getById(id);
  }

  // Verify purely by ID / QR reference (no re-supplied data to hash-compare)
  @Get(":id/verify")
  async verifyById(@Param("id") id: string) {
    return this.certificatesService.verifyById(id);
  }

  // Verify by manually re-entering certificate data (recomputes hash to catch tampering)
  @Post("verify")
  async verifyWithData(
    @Body(new ValidationPipe())
    dto: ManualVerifyCertificateDto,
  ) {
    return this.certificatesService.verifyWithData(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Post(":id/revoke")
  async revoke(
    @Param("id") id: string,
    @Body(new ValidationPipe()) dto: RevokeCertificateDto,
  ) {
    return this.certificatesService.revoke(id, dto.reason);
  }
}
