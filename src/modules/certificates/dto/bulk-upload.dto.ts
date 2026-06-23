import { ApiProperty } from "@nestjs/swagger";
import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { IssueCertificateDto } from "./issue-certificate.dto";

export class BulkUploadDto {
  @ApiProperty({ type: [IssueCertificateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueCertificateDto)
  certificates: IssueCertificateDto[] = [];
}
