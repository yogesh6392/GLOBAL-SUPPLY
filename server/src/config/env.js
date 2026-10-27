import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

export function getConfig() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith("replace-this")) {
    throw new Error("JWT_SECRET must be set to a unique value of at least 32 characters.");
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number.parseInt(process.env.PORT ?? "5000", 10),
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/global_supply_chain",
    jwtSecret
  };
}
