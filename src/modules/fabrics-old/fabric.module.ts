import { Module } from "@nestjs/common";
import { FabricService } from "./fabric.service";
import { FabricCaService } from "./fabric-ca.service";
import { AssetController } from "./assets.controller";

@Module({
  providers: [FabricService, FabricCaService],
  exports: [FabricService, FabricCaService],
  controllers: [AssetController],
})
export class FabricModule {}
