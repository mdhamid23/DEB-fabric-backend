import { PartialType } from "@nestjs/swagger";
import { IssueCertificateDto } from "./issue-certificate.dto";
import { IsOptional, IsString } from "class-validator";

export class UpdateCertificateDto extends PartialType(IssueCertificateDto) {
  @IsOptional()
  @IsString()
  status?: string;
}
