import mongoose from "mongoose";

const { Schema } = mongoose;
const objectId = { type: Schema.Types.ObjectId, required: true };

function registerModel(name, schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const supplierSchema = new Schema({
  organization: objectId,
  name: { type: String, required: true, trim: true, maxlength: 160 },
  contactName: { type: String, trim: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 40 },
  address: { type: String, trim: true, maxlength: 500 },
  participantOrganization: { type: Schema.Types.ObjectId, ref: "Organization" },
  active: { type: Boolean, default: true }
}, { timestamps: true });
supplierSchema.index({ organization: 1, name: 1 });

const productSchema = new Schema({
  organization: objectId,
  sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 80 },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 1000 },
  unit: { type: String, required: true, trim: true, maxlength: 32 },
  reorderPoint: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
productSchema.index({ organization: 1, sku: 1 }, { unique: true });

const warehouseSchema = new Schema({
  organization: objectId,
  name: { type: String, required: true, trim: true, maxlength: 160 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 80 },
  address: { type: String, trim: true, maxlength: 500 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
warehouseSchema.index({ organization: 1, code: 1 }, { unique: true });

const inventorySchema = new Schema({
  organization: objectId,
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  appliedMovements: {
    type: [{ type: Schema.Types.ObjectId, ref: "InventoryMovement" }],
    default: [],
    select: false
  }
}, { timestamps: true });
inventorySchema.index({ organization: 1, warehouse: 1, product: 1 }, { unique: true });

const movementSchema = new Schema({
  organization: objectId,
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  direction: { type: String, enum: ["in", "out"], required: true },
  status: { type: String, enum: ["pending", "applied", "failed"], default: "applied", required: true },
  reason: { type: String, trim: true, maxlength: 300 },
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

const purchaseOrderSchema = new Schema({
  buyerOrganization: objectId,
  supplierOrganization: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["draft", "submitted", "approved", "rejected", "confirmed"],
    default: "draft",
    required: true
  },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, min: 0.000001, required: true },
    unitPrice: { type: Number, min: 0, required: true }
  }],
  notes: { type: String, trim: true, maxlength: 2000 },
  transitions: [{
    from: { type: String, required: true },
    to: { type: String, required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, maxlength: 500 },
    at: { type: Date, required: true }
  }]
}, { timestamps: true });
purchaseOrderSchema.index({ buyerOrganization: 1, createdAt: -1 });
purchaseOrderSchema.index({ supplierOrganization: 1, createdAt: -1 });

const shipmentSchema = new Schema({
  buyerOrganization: objectId,
  supplierOrganization: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  providerOrganization: { type: Schema.Types.ObjectId, ref: "Organization" },
  purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  trackingNumber: { type: String, trim: true, maxlength: 100 },
  status: {
    type: String,
    enum: ["pending", "ready", "in_transit", "delayed", "delivered", "cancelled"],
    default: "pending",
    required: true
  },
  origin: { type: String, trim: true, required: true, maxlength: 240 },
  destination: { type: String, trim: true, required: true, maxlength: 240 },
  expectedDelivery: { type: Date },
  estimatedCost: { type: Number, min: 0 },
  actualDelivery: { type: Date },
  timeline: [{
    status: { type: String, required: true },
    message: { type: String, trim: true, maxlength: 500 },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, required: true }
  }]
}, { timestamps: true });
shipmentSchema.index({ buyerOrganization: 1, createdAt: -1 });
shipmentSchema.index({ supplierOrganization: 1, createdAt: -1 });
shipmentSchema.index({ providerOrganization: 1, createdAt: -1 });

const eventSchema = new Schema({
  organization: objectId,
  entityType: { type: String, enum: ["purchase_order", "shipment", "inventory"], required: true },
  entity: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true, maxlength: 100 },
  detail: { type: String, trim: true, maxlength: 1000 },
  actor: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
eventSchema.index({ organization: 1, entityType: 1, entity: 1, createdAt: -1 });

const notificationSchema = new Schema({
  organization: objectId,
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true, maxlength: 100 },
  message: { type: String, required: true, maxlength: 500 },
  readAt: { type: Date }
}, { timestamps: true });
notificationSchema.index({ organization: 1, recipient: 1, createdAt: -1 });

const auditLogSchema = new Schema({
  organization: objectId,
  actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true, maxlength: 100 },
  entityType: { type: String, required: true, maxlength: 100 },
  entity: { type: Schema.Types.ObjectId, required: true },
  details: { type: Schema.Types.Mixed }
}, { timestamps: true });
auditLogSchema.index({ organization: 1, createdAt: -1 });

export const Supplier = registerModel("Supplier", supplierSchema);
export const Product = registerModel("Product", productSchema);
export const Warehouse = registerModel("Warehouse", warehouseSchema);
export const Inventory = registerModel("Inventory", inventorySchema);
export const InventoryMovement = registerModel("InventoryMovement", movementSchema);
export const PurchaseOrder = registerModel("PurchaseOrder", purchaseOrderSchema);
export const Shipment = registerModel("Shipment", shipmentSchema);
export const OperationsEvent = registerModel("OperationsEvent", eventSchema);
export const Notification = registerModel("Notification", notificationSchema);
export const AuditLog = registerModel("AuditLog", auditLogSchema);
