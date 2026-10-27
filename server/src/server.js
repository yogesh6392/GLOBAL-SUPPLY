import mongoose from "mongoose";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { getConfig } from "./config/env.js";

const config = getConfig();

try {
  await connectDatabase(config.mongoUri);
  const server = app.listen(config.port, () => {
    console.log(`Supply-chain API listening at http://localhost:${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received; closing the API server.`);
    server.close(async (error) => {
      if (error) {
        console.error("Could not close the HTTP server cleanly.", error);
        process.exitCode = 1;
      }
      await mongoose.disconnect();
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
} catch (error) {
  console.error("The API could not start. Check the MongoDB connection and environment settings.", error);
  process.exitCode = 1;
}
