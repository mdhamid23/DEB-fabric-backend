import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDate,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { UserRole, UserStatus } from "../entities/user.entity";

// ────────────────────────────────────────────────────────────────
// CREATE USER DTO
// ────────────────────────────────────────────────────────────────

export class CreateUserDto {
  @ApiProperty({
    description: "Unique username for the user",
    example: "john_doe",
    minLength: 3,
    maxLength: 50,
  })
  @IsNotEmpty()
  username: string = "";

  @ApiProperty({
    description: "Password (min 8 characters)",
    example: "SecurePass123!",
    minLength: 8,
  })
  @IsNotEmpty()
  password: string = "";

  @ApiProperty({
    description: "User role",
    enum: UserRole,
    example: UserRole.ISSUER,
  })
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole = UserRole.ISSUER;

  @ApiPropertyOptional({
    description: "Initial user status",
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
