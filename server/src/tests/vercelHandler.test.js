import { after, before, test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-that-is-long-enough-123456";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

const { default: mongoose } = await import("mongoose");
const { MongoMemoryServer } = await import("mongodb-memory-server");
const { default: request } = await import("supertest");
let mongo;
let handler;

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  ({ default: handler } = await import("../../../api/[...path].js"));
});

after(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("Vercel API handler connects MongoDB before serving API routes", async () => {
  const response = await request((req, res) => handler(req, res)).get("/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    data: {
      service: "supply-chain-api",
      database: "connected"
    }
  });
});
