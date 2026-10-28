import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-that-is-long-enough-123456";

const { default: mongoose } = await import("mongoose");
const { MongoMemoryServer } = await import("mongodb-memory-server");
const { default: request } = await import("supertest");
const { default: app } = await import("../app.js");
const { default: User } = await import("../models/User.js");
const { default: Organization } = await import("../models/Organization.js");
const { default: Invitation } = await import("../models/Invitation.js");
const { Inventory, InventoryMovement, PurchaseOrder, Shipment, Supplier, Product, Warehouse } =
  await import("../models/Operations.js");
const { reconcilePendingStockMovements } = await import("../services/stockAdjustments.js");

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([
    User.init(),
    Organization.init(),
    Invitation.init(),
    Inventory.init(),
    InventoryMovement.init(),
    PurchaseOrder.init(),
    Shipment.init(),
    Supplier.init(),
    Product.init(),
    Warehouse.init()
  ]);
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Invitation.deleteMany({}),
    Inventory.deleteMany({}),
    InventoryMovement.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Shipment.deleteMany({}),
    Supplier.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({})
  ]);
});

after(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function createSession(role, email, organizationName) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    fullName: `${role} user`,
    email,
    password: "example-unique-pass-123",
    role,
    organizationName
  });
  assert.equal(response.status, 201, response.body.message);
  return { agent, user: response.body.data.user };
}

test("platform serves authenticated organization, catalog, analytics, route and admin APIs", async () => {
  const anonymous = request(app);
  await anonymous.get("/api/organization").expect(401);

  const { agent, user } = await createSession(
    "manufacturer",
    "platform-user@example.com",
    "Platform Test Organization"
  );
  const organization = await agent.get("/api/organization").expect(200);
  assert.equal(organization.body.data.organization.name, "Platform Test Organization");
  await agent.patch("/api/organization").send({ name: "Updated Test Organization" }).expect(200);

  // Algorithm endpoints removed per project requirement

  const network = await agent.get("/api/optimization/network").expect(200);
  assert.equal(network.body.data.source, "illustrative_demo_network");
  const route = await agent.post("/api/optimization/route").send({
    origin: "Central Hub",
    destination: "South Port",
    costPerDistance: 2
  }).expect(200);
  assert.equal(route.body.data.source, "illustrative_demo_network");
  assert.equal(route.body.data.estimatedCost, route.body.data.distance * 2);

  const analytics = await agent.get("/api/analytics/overview").expect(200);
  assert.equal(analytics.body.data.source, "live_database_records");
  assert.equal(analytics.body.data.totals.purchaseOrders, 0);
  await agent.get("/api/admin/users").expect(403);

  assert.equal(typeof user.organization.id, "string");
});

test("organization managers invite teammates, manage membership, and enforce invitation scope", async () => {
  const manufacturer = await createSession("manufacturer", "team-owner@example.com", "Team Workspace");
  const warehouseUser = await createSession("warehouse_manager", "warehouse-user@example.com", "Team Workspace");
  const outsider = await createSession("manufacturer", "other-owner@example.com", "Other Workspace");

  const denied = await warehouseUser.agent.get("/api/organization/members").expect(403);
  assert.match(denied.body.message, /Only organization administrators and manufacturers/);
  await warehouseUser.agent.post("/api/organization/invitations").send({
    email: "new-teammate@example.com",
    role: "supplier"
  }).expect(403);

  const created = await manufacturer.agent.post("/api/organization/invitations").send({
    email: " New-Teammate@example.com ",
    role: "warehouse_manager"
  }).expect(201);
  const inviteUrl = new URL(created.body.data.invitation.invitationUrl);
  const token = inviteUrl.pathname.split("/").at(-1);
  assert.equal(created.body.data.invitation.email, "new-teammate@example.com");
  assert.equal(created.body.data.invitation.role, "warehouse_manager");
  assert.equal(await Invitation.findOne({ email: "new-teammate@example.com" }).select("+tokenHash").then((row) =>
    row.tokenHash.includes(token)), false);
  await manufacturer.agent.post("/api/organization/invitations").send({
    email: "new-teammate@example.com",
    role: "supplier"
  }).expect(409);

  const invitationDetails = await request(app).get(`/api/auth/invitations/${token}`).expect(200);
  assert.equal(invitationDetails.body.data.invitation.organizationName, "Team Workspace");
  assert.equal(invitationDetails.body.data.invitation.email, "new-teammate@example.com");
  await request(app).post(`/api/auth/invitations/${token}/accept`).send({
    fullName: "New Teammate",
    password: "example-unique-pass-123"
  }).expect(201);
  await request(app).get(`/api/auth/invitations/${token}`).expect(404);

  const members = await manufacturer.agent.get("/api/organization/members").expect(200);
  const joined = members.body.data.members.find((member) => member.email === "new-teammate@example.com");
  assert.ok(joined);
  assert.equal(joined.role, "warehouse_manager");
  assert.equal(joined.active, true);

  await outsider.agent.patch(`/api/organization/members/${joined.id}`).send({ role: "supplier" }).expect(404);
  await manufacturer.agent.patch(`/api/organization/members/${joined.id}`).send({ role: "supplier" }).expect(200);
  await manufacturer.agent.patch(`/api/organization/members/${joined.id}`).send({ active: false }).expect(200);
  await request(app).post("/api/auth/login").send({
    email: "new-teammate@example.com",
    password: "example-unique-pass-123"
  }).expect(401);
  await manufacturer.agent.patch(`/api/organization/members/${manufacturer.user.id}`).send({ active: false }).expect(400);

  const anotherInvitation = await manufacturer.agent.post("/api/organization/invitations").send({
    email: "revoke-me@example.com",
    role: "supplier"
  }).expect(201);
  await manufacturer.agent.delete(`/api/organization/invitations/${anotherInvitation.body.data.invitation.id}`).expect(200);
  const revokedToken = new URL(anotherInvitation.body.data.invitation.invitationUrl).pathname.split("/").at(-1);
  await request(app).get(`/api/auth/invitations/${revokedToken}`).expect(404);
});

test("supplier directory, workflow transitions, stock guards and participant shipment access work", async () => {
  const buyer = await createSession("manufacturer", "buyer@example.com", "Buyer Organization");
  const supplierSession = await createSession("supplier", "supplier@example.com", "Supplier Organization");
  const logistics = await createSession(
    "logistics_provider",
    "logistics@example.com",
    "Logistics Organization"
  );
  const outsider = await createSession(
    "manufacturer",
    "outsider@example.com",
    "Unrelated Organization"
  );

  const supplierDirectory = await buyer.agent.post("/api/suppliers").send({
    name: "Test Supplier",
    participantOrganization: supplierSession.user.organization.id
  }).expect(201);
  const product = await buyer.agent.post("/api/products").send({
    sku: "TEST-001",
    name: "Industrial Component",
    unit: "piece",
    reorderPoint: 10
  }).expect(201);
  const warehouse = await buyer.agent.post("/api/warehouses").send({
    name: "Test Distribution Warehouse",
    code: "TEST-WH"
  }).expect(201);

  await buyer.agent.post("/api/inventory/movements").send({
    product: product.body.data.product._id,
    warehouse: warehouse.body.data.warehouse._id,
    direction: "in",
    quantity: 8,
    reason: "Test stock receipt"
  }).expect(201);
  await buyer.agent.post("/api/inventory/movements").send({
    product: product.body.data.product._id,
    warehouse: warehouse.body.data.warehouse._id,
    direction: "out",
    quantity: 9
  }).expect(409);

  const stock = await buyer.agent.get("/api/inventory").expect(200);
  assert.equal(stock.body.data.inventory.length, 1);
  assert.equal(stock.body.data.inventory[0].quantity, 8);
  const history = await buyer.agent.get("/api/inventory/movements").expect(200);
  assert.equal(history.body.data.movements[0].status, "applied");
  assert.equal(history.body.data.movements[0].reason, "Test stock receipt");
  const reorder = await buyer.agent.get("/api/inventory/reorder-suggestions").expect(200);
  assert.equal(reorder.body.data.suggestions[0].suggestedQuantity, 2);
  const pendingMovement = await InventoryMovement.create({
    organization: buyer.user.organization.id,
    warehouse: warehouse.body.data.warehouse._id,
    product: product.body.data.product._id,
    performedBy: buyer.user.id,
    direction: "in",
    quantity: 2,
    status: "pending",
    reason: "Simulated interruption for recovery test"
  });
  const reconciled = await reconcilePendingStockMovements();
  assert.deepEqual(reconciled, [{ movementId: String(pendingMovement._id), status: "applied" }]);
  assert.deepEqual(await reconcilePendingStockMovements(), []);

  const concurrentMovements = await Promise.all([
    buyer.agent.post("/api/inventory/movements").send({
      product: product.body.data.product._id,
      warehouse: warehouse.body.data.warehouse._id,
      direction: "out",
      quantity: 6
    }),
    buyer.agent.post("/api/inventory/movements").send({
      product: product.body.data.product._id,
      warehouse: warehouse.body.data.warehouse._id,
      direction: "out",
      quantity: 6
    })
  ]);
  assert.deepEqual(concurrentMovements.map((response) => response.status).sort(), [201, 409]);
  const afterConcurrentMovements = await buyer.agent.get("/api/inventory").expect(200);
  assert.equal(afterConcurrentMovements.body.data.inventory[0].quantity, 4);

  const order = await buyer.agent.post("/api/purchase-orders").send({
    supplier: supplierDirectory.body.data.supplier._id,
    items: [{ product: product.body.data.product._id, quantity: 2, unitPrice: 3.5 }]
  }).expect(201);
  await buyer.agent.patch(`/api/purchase-orders/${order.body.data.purchaseOrder._id}/status`)
    .send({ status: "submitted" }).expect(200);
  await buyer.agent.patch(`/api/purchase-orders/${order.body.data.purchaseOrder._id}/status`)
    .send({ status: "approved" }).expect(200);
  await supplierSession.agent.patch(`/api/purchase-orders/${order.body.data.purchaseOrder._id}/status`)
    .send({ status: "confirmed" }).expect(200);
  await outsider.agent.get("/api/purchase-orders").expect(200)
    .then((response) => assert.equal(response.body.data.purchaseOrders.length, 0));

  const shipment = await buyer.agent.post("/api/shipments").send({
    purchaseOrder: order.body.data.purchaseOrder._id,
    providerOrganization: logistics.user.organization.id,
    origin: "North warehouse",
    destination: "Customer distribution center",
    expectedDelivery: "2030-01-01T00:00:00.000Z",
    trackingNumber: "DEMO-TEST-1"
  }).expect(201);
  const shipmentId = shipment.body.data.shipment._id;
  await supplierSession.agent.patch(`/api/shipments/${shipmentId}/status`)
    .send({ status: "ready" }).expect(200);
  await logistics.agent.patch(`/api/shipments/${shipmentId}/status`)
    .send({ status: "in_transit" }).expect(200);
  const delivered = await logistics.agent.patch(`/api/shipments/${shipmentId}/status`)
    .send({ status: "delivered" }).expect(200);
  assert.equal(delivered.body.data.shipment.timeline.length, 4);
  await outsider.agent.get("/api/shipments").expect(200)
    .then((response) => assert.equal(response.body.data.shipments.length, 0));
});

test("supplier role cannot create buyer-owned procurement records", async () => {
  const supplier = await createSession("supplier", "supplier-only@example.com", "Supplier Only");
  await supplier.agent.post("/api/products").send({
    sku: "X1",
    name: "Restricted product",
    unit: "each"
  }).expect(403);
});

test("administrator users are visible only through the administrator-protected endpoint", async () => {
  const { agent } = await createSession("manufacturer", "company-user@example.com", "Company");
  await agent.get("/api/admin/users").expect(403);

  const organization = await Organization.create({ name: "Platform Administration" });
  await User.create({
    fullName: "Platform Admin",
    email: "platform-admin@example.com",
    passwordHash: await bcrypt.hash("test-only-admin-secret", 4),
    role: "admin",
    organization: organization._id
  });
  const administrator = request.agent(app);
  await administrator.post("/api/auth/login").send({
    email: "platform-admin@example.com",
    password: "test-only-admin-secret"
  }).expect(200);
  const response = await administrator.get("/api/admin/users").expect(200);
  assert.equal(response.body.data.users.length, 2);
  assert.ok(response.body.data.users.some((record) => record.role === "admin"));
});
