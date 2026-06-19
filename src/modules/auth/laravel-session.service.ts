import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

@Injectable()
export class LaravelSessionService {
  private readonly logger = new Logger(LaravelSessionService.name);

  constructor(private configService: ConfigService) {}

  async getTokensFromSession(encryptedCookie: string): Promise<{
    accessToken: string;
    refreshToken: string;
  } | null> {
    const appKey = this.configService.get<string>("LARAVEL_APP_KEY");
    const sessionPath = this.configService.get<string>("LARAVEL_SESSION_PATH");
    const phpPath = "/opt/homebrew/bin/php"; // Verified path on this system

    if (!appKey || !sessionPath) {
      this.logger.error(
        "LARAVEL_APP_KEY or LARAVEL_SESSION_PATH not configured",
      );
      return null;
    }

    // This PHP script decrypts the Laravel cookie and reads the session file.
    // It handles both encrypted session ID and file-based session parsing.
    const phpScript = `
$key = base64_decode(str_replace("base64:", "", $argv[1]));
$payload = json_decode(base64_decode($argv[2]), true);
if (!$payload || !isset($payload["iv"], $payload["value"])) { exit(1); }
$iv = base64_decode($payload["iv"]);
$value = base64_decode($payload["value"]);
$decrypted = openssl_decrypt($value, "AES-256-CBC", $key, 0, $iv);
if (!$decrypted) { exit(1); }
$sessionId = unserialize($decrypted);
if (!$sessionId) { exit(1); }
$filePath = $argv[3] . "/" . $sessionId;
if (!file_exists($filePath)) { exit(1); }
$sessionData = unserialize(file_get_contents($filePath));
echo json_encode([
    "access_token" => $sessionData["auth_server_access_token"] ?? null,
    "refresh_token" => $sessionData["auth_server_refresh_token"] ?? null
]);
    `;

    const tmpFile = `/tmp/laravel_bridge_${Date.now()}.php`;
    const fullPhpScript = `<?php\n${phpScript}`;

    try {
      const fs = require("fs");
      const { writeFileSync, unlinkSync } = fs;
      writeFileSync(tmpFile, fullPhpScript);

      const { stdout } = await execAsync(
        `${phpPath} "${tmpFile}" "${appKey}" "${encryptedCookie}" "${sessionPath}"`,
      );

      unlinkSync(tmpFile);

      const result = JSON.parse(stdout);
      if (result.access_token && result.refresh_token) {
        return {
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
        };
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to extract Laravel session: ${error}`);
      return null;
    }
  }
}
