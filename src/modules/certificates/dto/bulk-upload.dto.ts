// src/modules/certificates/dto/bulk-issue-certificate.dto.ts

import {
  IsArray,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { IssueCertificateDto } from "./issue-certificate.dto";

// src/modules/certificates/dto/bulk-issue-certificate.dto.ts

export class BulkIssueCertificateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueCertificateDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsOptional()
  certificates?: IssueCertificateDto[];

  // Allow the DTO to accept either format
  constructor(partial?: Partial<BulkIssueCertificateDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class BulkCreateResultDto {
  total: number = 0;
  created: number = 0;
  failed: number = 0;
  errors: {
    index: number;
    rollNumber: string;
    registrationNumber: string;
    error: string;
  }[] = [];
  certificates: {
    certificateId: string;
    studentName: string;
    examName: string;
    result: string;
    board: string;
    passingYear: string;
    status: string;
    qrToken: string;
    issuedAt: Date;
  }[] = [];
}
