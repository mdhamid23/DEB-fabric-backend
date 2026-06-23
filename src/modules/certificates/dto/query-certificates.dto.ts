import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from "class-validator";

import { Type } from "class-transformer";
import { CertificateStatus } from "@/src/common/enums/certificate-status.enum";

export class QueryCertificatesDto {
  @ApiPropertyOptional({ enum: CertificateStatus })
  @IsOptional()
  @IsEnum(CertificateStatus)
  status?: CertificateStatus;

  @ApiPropertyOptional({ example: "Hamid" })
  @IsOptional()
  @IsString()
  studentName?: string;

  @ApiPropertyOptional({ example: "HSC" })
  @IsOptional()
  @IsString()
  examName?: string;

  @ApiPropertyOptional({ example: "2024" })
  @IsOptional()
  @IsString()
  passingYear?: string;

  @ApiPropertyOptional({ example: "Dhaka Education Board" })
  @IsOptional()
  @IsString()
  board?: string;

  @ApiPropertyOptional({ example: "2024-01-01" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: "2024-12-31" })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ example: "createdAt" })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ enum: ["ASC", "DESC"] })
  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "DESC";
}
