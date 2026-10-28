import mongoose from "mongoose";
import app from "../server/src/app.js";
import { connectDatabase } from "../server/src/config/database.js";
import { getConfig } from "../server/src/config/env.js";

let databaseConnection;

async function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return;

  const mongoUri = process.env.MONGODB_URI || getConfig().mongoUri;
  const isLocalMongo = mongoUri.includes("127.0.0.1") || mongoUri.includes("localhost");

  // On Vercel, localhost is never reachable
  if (process.env.VERCEL && isLocalMongo) {
    throw new Error("MONGODB_URI is not set to a remote MongoDB Atlas URI. Localhost is unavailable in serverless.");
  }

  if (!databaseConnection) {
    databaseConnection = connectDatabase(mongoUri).catch((error) => {
      databaseConnection = null;
      throw error;
    });
  }
  await databaseConnection;
}

export default async function handler(request, response) {
  // Normalize request.url if Vercel serverless rewrite passed path in query or stripped prefix
  if (request.url.startsWith("/api/[...path]") || request.url.startsWith("/api?")) {
    const rawPath = request.query?.path;
    const pathString = Array.isArray(rawPath) ? rawPath.join("/") : (rawPath || "");
    const queryString = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
    request.url = `/api/${pathString}${queryString}`.replace(/\/+/g, "/");
  }

  // Health check endpoint can be handled directly
  if (request.url.startsWith("/api/health")) {
    try {
      await ensureDatabaseConnection();
    } catch {
      // Allow /api/health to return database: "disconnected" cleanly
    }
    return app(request, response);
  }

  try {
    await ensureDatabaseConnection();
  } catch (error) {
    console.warn("The Vercel API could not connect to MongoDB:", error.message);
    return response.status(503).json({
      success: false,
      message: "The API database is unavailable. Set MONGODB_URI in Vercel or use Demo Mode."
    });
  }

  return app(request, response);
}
