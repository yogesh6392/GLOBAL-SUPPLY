import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "dist");
const rootDist = path.join(__dirname, "..", "dist");

try {
  if (fs.existsSync(clientDist)) {
    fs.cpSync(clientDist, rootDist, { recursive: true, force: true });
    console.log("Successfully mirrored client/dist to ../dist");
  } else if (fs.existsSync(rootDist)) {
    fs.cpSync(rootDist, clientDist, { recursive: true, force: true });
    console.log("Successfully mirrored ../dist to client/dist");
  }
} catch (err) {
  console.warn("Could not mirror dist directory:", err.message);
}
