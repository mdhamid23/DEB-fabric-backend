// src/modules/certificates/dto/issue-certificate.dto.ts
import { IsNotEmpty, IsString, IsOptional, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ManualVerifyCertificateDto {
  @ApiProperty({ example: "12345" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  rollNumber: string = "";

  @ApiProperty({ example: "REG-2024-001" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  registrationNumber: string = "";

  @ApiProperty({ example: "2024" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  passingYear: string = "";
}
