import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-that-is-long-enough-123456";

const { default: mongoose } = await import("mongoose");
const { MongoMemoryServer } = await import("mongodb-memory-server");
const { default: request } = await import("supertest");
const { default: app } = await import("../app.js");
const { default: User } = await import("../models/User.js");
const { default: Organization } = await import("../models/Organization.js");

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Organization.init()]);
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Organization.deleteMany({})]);
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongo) {
    await mongo.stop();
  }
});

const newAccount = {
  fullName: "Alex Morgan",
  email: "alex@example.com",
  password: "correct-horse-42",
  role: "manufacturer",
  organizationName: "Northstar Manufacturing"
};

test("health check reports the connected database", async () => {
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.database, "connected");
});

test("registration creates a hashed-password account and authenticated session", async () => {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send(newAccount);

  assert.equal(response.status, 201);
  assert.equal(response.body.data.user.role, "manufacturer");
  assert.equal(response.body.data.user.organization.name, newAccount.organizationName);
  assert.ok(response.headers["set-cookie"].some((cookie) => cookie.includes("HttpOnly")));

  const savedUser = await User.findOne({ email: newAccount.email }).select("+passwordHash");
  assert.notEqual(savedUser.passwordHash, newAccount.password);
  assert.equal(await agent.get("/api/auth/me").expect(200).then((result) => result.body.data.user.email), newAccount.email);
});

test("public registration rejects administrator privileges", async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ ...newAccount, role: "admin" });

  assert.equal(response.status, 400);
});

test("login rejects invalid credentials and accepts a valid password", async () => {
  await request(app).post("/api/auth/register").send(newAccount).expect(201);
  await request(app)
    .post("/api/auth/login")
    .send({ email: newAccount.email, password: "wrong-password" })
    .expect(401);

  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: newAccount.email, password: newAccount.password })
    .expect(200);
  await agent.get("/api/auth/me").expect(200);
});

test("duplicate registration returns a conflict without creating an extra organization", async () => {
  await request(app).post("/api/auth/register").send(newAccount).expect(201);
  const response = await request(app)
    .post("/api/auth/register")
    .send({ ...newAccount, organizationName: "Another Organization" });

  assert.equal(response.status, 409);
  assert.equal(await Organization.countDocuments(), 1);
});

test("protected dashboard denies anonymous access and accepts a valid session", async () => {
  await request(app).get("/api/dashboard").expect(401);

  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(newAccount).expect(201);
  const response = await agent.get("/api/dashboard").expect(200);
  assert.equal(response.body.data.role, "manufacturer");
  assert.equal(response.body.data.dataStatus, "Operational records have not been added yet.");
});

test("logout clears the session and prevents later protected access", async () => {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send(newAccount).expect(201);
  await agent.post("/api/auth/logout").expect(200);
  await agent.get("/api/auth/me").expect(401);
});
