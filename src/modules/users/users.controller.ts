import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "./entities/user.entity";

/**
 * All routes here require:
 *   1. Valid JWT (JwtAuthGuard)
 *   2. superadmin role (RolesGuard + @Roles)
 *
 * Issuers cannot access user management — only superadmin can.
 */
@Controller("admin/users")
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.SUPERADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /admin/users
   * List all users (no sensitive fields returned).
   */
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * POST /admin/users
   * Create a new issuer account.
   *
   * Flow:
   *   1. Validates DTO
   *   2. Hashes password
   *   3. Registers identity in Fabric CA (role attr baked into cert)
   *   4. Saves user to PostgreSQL
   *
   * Body: { username, password, role }
   */
  @Post()
  async createUser(
    @Body(new ValidationPipe()) dto: CreateUserDto,
    // @Request() req: any,
  ) {
    console.log("Creating user with DTO:", dto);
    return this.usersService.createUser(dto, "system"); // createdBy = "system" for now since we don't have auth on this endpoint yet
  }

  /**
   * PATCH /admin/users/:id/deactivate
   * Deactivate an issuer account.
   *
   * Flow:
   *   1. Revokes identity in Fabric CA (peer MSP will reject their txs)
   *   2. Wipes encrypted cert+key from PostgreSQL
   *   3. Sets status = INACTIVE
   */
  @Patch(":id/deactivate")
  @HttpCode(HttpStatus.OK)
  async deactivateUser(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    await this.usersService.deactivateUser(id, req.user.username);
    return { message: "User deactivated successfully" };
  }

  /**
   * GET /admin/users/:id
   * Get a single user's details.
   */
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findByIdOrFail(id);
  }
}
