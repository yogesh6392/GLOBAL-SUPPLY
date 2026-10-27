import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { getConfig } from "../config/env.js";
import {
  AuditLog,
  Inventory,
  InventoryMovement,
  Notification,
  Product,
  PurchaseOrder,
  Shipment,
  Supplier,
  Warehouse
} from "../models/Operations.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";

const config = getConfig();
const password = process.env.SEED_DEMO_PASSWORD;
const allowed = process.env.ALLOW_DEMO_SEED === "true";
const demoAccounts = [
  { role: "manufacturer", email: "manufacturer@demo.globalchain.local", organization: "Northstar Demo Manufacturing" },
  { role: "supplier", email: "supplier@demo.globalchain.local", organization: "Atlas Demo Components" },
  { role: "warehouse_manager", email: "warehouse@demo.globalchain.local", organization: "Harbor Demo Warehouse" },
  { role: "logistics_provider", email: "logistics@demo.globalchain.local", organization: "Meridian Demo Logistics" }
];
const created = {
  organizations: [],
  users: [],
  suppliers: [],
  products: [],
  warehouses: [],
  inventory: [],
  movements: [],
  purchaseOrders: [],
  shipments: [],
  notifications: [],
  auditLogs: []
};

if (config.nodeEnv === "production" || !allowed) {
  throw new Error("Demo seeding is disabled. Use a non-production environment and explicitly set ALLOW_DEMO_SEED=true.");
}
if (typeof password !== "string" || Buffer.byteLength(password, "utf8") < 12 ||
    Buffer.byteLength(password, "utf8") > 72) {
  throw new Error("Set SEED_DEMO_PASSWORD to a unique, temporary demo password between 12 and 72 bytes.");
}
if (demoAccounts.some((account) => account.email === process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase())) {
  throw new Error("Demo account email conflicts with the configured administrator email.");
}

await connectDatabase(config.mongoUri);
try {
  const existingDemoUser = await User.findOne({ email: { $in: demoAccounts.map(({ email }) => email) } });
  if (existingDemoUser) {
    throw new Error("Demo accounts already exist. The seed command does not overwrite existing data.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const createdAccounts = [];
  for (const account of demoAccounts) {
    const organization = await Organization.create({ name: account.organization });
    created.organizations.push(organization._id);
    const user = await User.create({
      fullName: account.role === "manufacturer" ? "Morgan Manufacturer" : `${account.role.replaceAll("_", " ")} demo`,
      email: account.email,
      passwordHash,
      role: account.role,
      organization: organization._id
    });
    created.users.push(user._id);
    await Organization.updateOne({ _id: organization._id }, { $set: { createdBy: user._id } });
    createdAccounts.push({ organization, user });
  }

  const [buyer, supplier, , logistics] = createdAccounts;
  const supplierProfile = await Supplier.create({
    organization: buyer.organization._id,
    name: "Atlas Components (DEMO)",
    contactName: "Demo Supplier Contact",
    email: "supplier@demo.globalchain.local",
    participantOrganization: supplier.organization._id
  });
  created.suppliers.push(supplierProfile._id);

  const product = await Product.create({
    organization: buyer.organization._id,
    sku: "DEMO-BOLT-001",
    name: "Stainless Fastener (DEMO)",
    description: "Clearly labelled sample component for the college demonstration.",
    unit: "box",
    reorderPoint: 30
  });
  created.products.push(product._id);

  const warehouse = await Warehouse.create({
    organization: buyer.organization._id,
    name: "Northstar Demo Warehouse",
    code: "DEMO-NW-01",
    address: "Illustrative demo location"
  });
  created.warehouses.push(warehouse._id);

  const inventory = await Inventory.create({
    organization: buyer.organization._id,
    warehouse: warehouse._id,
    product: product._id,
    quantity: 24,
    updatedBy: buyer.user._id
  });
  created.inventory.push(inventory._id);
  for (const movement of [
    { direction: "in", quantity: 40, reason: "Seeded illustrative opening stock" },
    { direction: "out", quantity: 16, reason: "Seeded illustrative allocation" }
  ]) {
    const record = await InventoryMovement.create({
      organization: buyer.organization._id,
      warehouse: warehouse._id,
      product: product._id,
      performedBy: buyer.user._id,
      ...movement
    });
    created.movements.push(record._id);
  }

  const purchaseOrder = await PurchaseOrder.create({
    buyerOrganization: buyer.organization._id,
    supplierOrganization: supplier.organization._id,
    supplier: supplierProfile._id,
    createdBy: buyer.user._id,
    status: "confirmed",
    notes: "Seeded illustrative sample purchase order.",
    items: [{
      product: product._id,
      sku: product.sku,
      name: product.name,
      quantity: 8,
      unitPrice: 12.5
    }],
    transitions: [
      { from: "draft", to: "submitted", by: buyer.user._id, note: "Demo submission", at: new Date() },
      { from: "submitted", to: "approved", by: buyer.user._id, note: "Demo approval", at: new Date() },
      { from: "approved", to: "confirmed", by: supplier.user._id, note: "Demo supplier confirmation", at: new Date() }
    ]
  });
  created.purchaseOrders.push(purchaseOrder._id);

  const expectedDelivery = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const shipment = await Shipment.create({
    buyerOrganization: buyer.organization._id,
    supplierOrganization: supplier.organization._id,
    providerOrganization: logistics.organization._id,
    purchaseOrder: purchaseOrder._id,
    assignedBy: buyer.user._id,
    trackingNumber: "DEMO-SHIP-0001",
    origin: "Northstar demo warehouse",
    destination: "Atlas demo distribution point",
    expectedDelivery,
    estimatedCost: 42.5,
    status: "in_transit",
    timeline: [
      { status: "pending", message: "DEMO: Shipment created.", by: buyer.user._id, at: new Date() },
      { status: "ready", message: "DEMO: Supplier marked shipment ready.", by: supplier.user._id, at: new Date() },
      { status: "in_transit", message: "DEMO: Logistics provider started the sample delivery.", by: logistics.user._id, at: new Date() }
    ]
  });
  created.shipments.push(shipment._id);

  for (const account of [buyer, supplier, logistics]) {
    const notification = await Notification.create({
      organization: account.organization._id,
      recipient: account.user._id,
      type: "demo.seed",
      message: "Illustrative seeded demo data is available in this organization."
    });
    created.notifications.push(notification._id);
    const audit = await AuditLog.create({
      organization: account.organization._id,
      actor: account.user._id,
      action: "demo.seeded",
      entityType: "organization",
      entity: account.organization._id,
      details: { label: "DEMO DATA" }
    });
    created.auditLogs.push(audit._id);
  }

  console.log("Illustrative demo data created. The seeded records and all demo-account addresses are clearly labelled.");
  console.log("Demo accounts:");
  for (const account of demoAccounts) console.log(`  ${account.role}: ${account.email}`);
  console.log("All demo accounts use the temporary SEED_DEMO_PASSWORD you supplied.");
} catch (error) {
  const collections = [
    [AuditLog, created.auditLogs],
    [Notification, created.notifications],
    [Shipment, created.shipments],
    [PurchaseOrder, created.purchaseOrders],
    [InventoryMovement, created.movements],
    [Inventory, created.inventory],
    [Warehouse, created.warehouses],
    [Product, created.products],
    [Supplier, created.suppliers],
    [User, created.users],
    [Organization, created.organizations]
  ];
  for (const [Model, ids] of collections) {
    if (ids.length > 0) await Model.deleteMany({ _id: { $in: ids } });
  }
  throw error;
} finally {
  await mongoose.disconnect();
}
