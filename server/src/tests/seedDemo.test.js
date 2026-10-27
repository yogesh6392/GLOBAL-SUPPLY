import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-that-is-long-enough-123456";

const { default: mongoose } = await import("mongoose");
const { MongoMemoryServer } = await import("mongodb-memory-server");
const { default: User } = await import("../models/User.js");
const { Product, PurchaseOrder, Shipment, Inventory } = await import("../models/Operations.js");

const seedScript = fileURLToPath(new URL("../scripts/seedDemo.js", import.meta.url));
const root = fileURLToPath(new URL("../../../", import.meta.url));
let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
});

after(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

function runSeed(additionalEnvironment = {}) {
  return spawnSync(process.execPath, [seedScript], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "test",
      JWT_SECRET: "test-only-secret-that-is-long-enough-123456",
      MONGODB_URI: mongo.getUri(),
      ALLOW_DEMO_SEED: "true",
      SEED_DEMO_PASSWORD: "temporary-demo-password-123",
      ...additionalEnvironment
    }
  });
}

test("demo seeding is explicit, creates usable labelled demo workflows and refuses duplicate seeds", async () => {
  const missingOptIn = runSeed({ ALLOW_DEMO_SEED: "false" });
  assert.notEqual(missingOptIn.status, 0);
  assert.match(missingOptIn.stderr, /explicitly set ALLOW_DEMO_SEED=true/);

  const firstRun = runSeed();
  assert.equal(firstRun.status, 0, firstRun.stderr);
  assert.match(firstRun.stdout, /manufacturer@demo\.globalchain\.local/);

  await mongoose.connect(mongo.getUri());
  assert.equal(await User.countDocuments(), 4);
  assert.equal(await Product.countDocuments({ name: /DEMO/ }), 1);
  assert.equal(await PurchaseOrder.countDocuments({ status: "confirmed" }), 1);
  assert.equal(await Shipment.countDocuments({ status: "in_transit" }), 1);
  const [inventory] = await Inventory.find();
  assert.equal(inventory.quantity, 24);
  await mongoose.disconnect();

  const duplicateRun = runSeed();
  assert.notEqual(duplicateRun.status, 0);
  assert.match(duplicateRun.stderr, /already exist/);

  await mongoose.connect(mongo.getUri());
  assert.equal(await User.countDocuments(), 4);
});
