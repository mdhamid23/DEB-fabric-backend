import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { FabricService } from "./fabric.service";
import { FabricCaService } from "./fabric-ca.service";
import { Response } from "express";

@Controller("api")
export class AssetController {
  constructor(
    private readonly fabricService: FabricService,
    private readonly fabricCaService: FabricCaService,
  ) {}

  @Get("users")
  async getAllUsers(@Res() res: Response) {
    try {
      const users = await this.fabricCaService.getAllUsers();
      return res.status(HttpStatus.OK).json({
        totalUsers: users.length,
        users: users,
      });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: error });
    }
  }

  @Post("users")
  async registerUser(
    @Body() body: { username: string; secret: string },
    @Res() res: Response,
  ) {
    try {
      await this.fabricCaService.registerAndEnrollUser(
        body.username,
        body.secret,
      );
      return res.status(HttpStatus.CREATED).json({
        message: `User ${body.username} added and enrolled successfully.`,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
    }
  }

  @Get("assets/:assetId/user/:username")
  async getAssetAsUser(
    @Param("assetId") assetId: string,
    @Param("username") username: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.fabricService.readAssetAsSpecificUser(
        username,
        assetId,
      );
      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error });
    }
  }

  @Post("assets")
  async createAsset(
    @Body()
    body: {
      id: string;
      color: string;
      size: number;
      owner: string;
      value: number;
    },
    @Res() res: Response,
  ) {
    try {
      await this.fabricService.createAsset(
        body.id,
        body.color,
        body.size,
        body.owner,
        body.value,
      );
      return res
        .status(HttpStatus.CREATED)
        .json({ message: `Asset ${body.id} created successfully.` });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error });
    }
  }

  @Get("assets/owner/:ownerName")
  async getAssetsByOwner(
    @Param("ownerName") ownerName: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.fabricService.getAssetsByOwner(ownerName);
      return res.status(HttpStatus.OK).json({
        owner: ownerName,
        totalAssets: data.length,
        assets: data,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error });
    }
  }

  @Get("assets/:id")
  async getAsset(@Param("id") id: string, @Res() res: Response) {
    try {
      const data = await this.fabricService.readAsset(id);
      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: error });
    }
  }

  @Put("assets/:id")
  async updateAsset(
    @Param("id") id: string,
    @Body() body: { color: string; size: number; owner: string; value: number },
    @Res() res: Response,
  ) {
    try {
      await this.fabricService.updateAsset(
        id,
        body.color,
        body.size,
        body.owner,
        body.value,
      );
      return res
        .status(HttpStatus.OK)
        .json({ message: `Asset ${id} updated successfully.` });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error });
    }
  }

  @Post("assets/transfer")
  async transferAsset(
    @Body() body: { assetId: string; fromUser: string; toUser: string },
    @Res() res: Response,
  ) {
    try {
      const result = await this.fabricService.transferAsset(
        body.assetId,
        body.fromUser,
        body.toUser,
      );
      return res.status(HttpStatus.OK).json({ message: result });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
    }
  }

  @Get("assets/history/:assetId")
  async getAssetHistory(
    @Param("assetId") assetId: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.fabricService.getAssetHistory(assetId);
      return res.status(HttpStatus.OK).json({
        assetId: assetId,
        historyCount: data.length,
        history: data,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
    }
  }

  @Delete("assets/:id")
  async deleteAsset(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.fabricService.deleteAsset(id);
      return res
        .status(HttpStatus.OK)
        .json({ message: `Asset ${id} deleted from ledger.` });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: error });
    }
  }
}
