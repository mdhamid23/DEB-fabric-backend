// src/modules/certificates/dto/issue-certificate.dto.ts
import { IsNotEmpty, IsString, IsOptional, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IssueCertificateDto {
  @ApiProperty({ example: "Md. Hamid Uddin" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  studentName: string = "";

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

  @ApiProperty({ example: "Dhaka College" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  institute: string = "";

  @ApiProperty({ example: "HSC" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  examName: string = "";

  @ApiProperty({ example: "A+" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  result: string = "";

  @ApiProperty({ example: "2024" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  passingYear: string = "";

  @ApiProperty({ example: "Dhaka Education Board" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  board: string = "";

  @ApiPropertyOptional({ example: "QR Code Token" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  qrCodeToken?: string;
}
