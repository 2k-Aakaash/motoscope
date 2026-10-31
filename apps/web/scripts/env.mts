// Loads apps/web/.env.local for CLI scripts (Next.js does this itself for the app). Real environment variables win.
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}
