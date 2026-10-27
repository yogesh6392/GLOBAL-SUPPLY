import mongoose from "mongoose";
import app from "../server/src/app.js";
import { connectDatabase } from "../server/src/config/database.js";
import { getConfig } from "../server/src/config/env.js";

let databaseConnection;

async function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return;
  if (!databaseConnection) {
    databaseConnection = connectDatabase(getConfig().mongoUri).catch((error) => {
      databaseConnection = null;
      throw error;
    });
  }
  await databaseConnection;
}

export default async function handler(request, response) {
  try {
    await ensureDatabaseConnection();
  } catch (error) {
    console.error("The Vercel API could not connect to MongoDB.", error);
    return response.status(503).json({
      success: false,
      message: "The API database is unavailable. Check the deployment database configuration."
    });
  }

  return app(request, response);
}
