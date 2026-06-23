import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PostgresDatabaseProviderModule } from "@/providers/database/postgres/provider.module";
import { AppController } from "@/src/app.controller";
import { AppService } from "@/src/app.service";
import global_config from "@/config/global_config";
import { BullModule } from "@nestjs/bull";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { RedisCacheModule } from "./providers/cache/redis/redis-cache.module";
import { AuthModule } from "@/src/modules/auth/auth.module";
import { FabricModule } from "./modules/fabrics-old/fabric.module";
import { FabricModuleNew } from "./modules/fabric/fabric.module";
import { CertificatesModule } from "./modules/certificates/certificates.module";
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // 1. Setup Redis Storage for Distributed Systems
        const redisHost = config.get("REDIS_HOST");
        const storage = redisHost
          ? new ThrottlerStorageRedisService({
              host: redisHost,
              port: config.get("REDIS_PORT") || 6379,
              password: config.get("REDIS_PASSWORD"),
            })
          : undefined; // Falls back to Memory if no Redis config found

        return {
          throttlers: [
            {
              name: "default",
              ttl: 60000, // 1 Minute
              limit: 100, // Global Default: 100 requests per minute
            },
          ],
          storage,
          // 2. Customize the Error Message (Optional)
          errorMessage: "Rate limit exceeded. Please try again later.",
        };
      },
    }),
    PostgresDatabaseProviderModule,

    ConfigModule.forRoot({
      isGlobal: true,
      load: [],
    }),
    BullModule.forRoot({
      url: process.env.REDIS_URL,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [global_config],
    }),
    AuthModule,
    RedisCacheModule,
    FabricModule,
    FabricModuleNew,
    CertificatesModule,
  ],
  controllers: [AppController],
  providers: [AppService, ThrottlerGuard],
})
export class AppModule {}
