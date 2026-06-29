import { seeder } from "nestjs-seeder";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import dataSourceOptions from "./config/database.config";
import { UserFactory } from "./database/factories/user.factory";
import { UserSeeder } from "./database/seeders/user.seeder";

seeder({
  imports: [
    // Import ConfigModule to make ConfigService available
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
      envFilePath: ".env",
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      entities: [__dirname + "/database/factories/*.factory.{ts,js}"],
    }),
    TypeOrmModule.forFeature([UserFactory]),
  ],
}).run([UserSeeder]);
