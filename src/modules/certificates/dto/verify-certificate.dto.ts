import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class VerifyCertificateDto {
  @ApiProperty({ example: "CERT-2024-0001" })
  @IsNotEmpty()
  @IsString()
  certificateId: string = "";

  @ApiPropertyOptional({
    example: "student-name|12345|REG-2024-001|...",
    description: "Optional: recomputed hash for tamper detection",
  })
  @IsOptional()
  @IsString()
  suppliedHash?: string;
}

// src/modules/certificates/dto/revoke-certificate.dto.ts
