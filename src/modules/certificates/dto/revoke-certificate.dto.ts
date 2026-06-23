import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RevokeCertificateDto {
  @ApiProperty({ example: "Certificate issued in error" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string = "";
}
