import { Module } from "@nestjs/common";
import { FabricModuleNew } from "../fabric/fabric.module";
import { CertificatesController } from "./certificates.controller";
import { CertificatesService } from "./certificates.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Certificate } from "./entities/certificate.entity";
import { QrCodeService } from "./qr-code.service";
import { JwtService } from "@nestjs/jwt";
import { User } from "../users/entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, User]), FabricModuleNew],
  controllers: [CertificatesController],
  providers: [CertificatesService, QrCodeService, JwtService],
})
export class CertificatesModule {}
