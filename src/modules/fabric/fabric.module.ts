import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FabricGatewayService } from "./fabric-gateway.service";
import { FabricCaService } from "./fabric-ca.service";

@Module({
  imports: [ConfigModule],
  providers: [FabricGatewayService, FabricCaService],
  exports: [FabricGatewayService, FabricCaService],
})
export class FabricModuleNew {}
