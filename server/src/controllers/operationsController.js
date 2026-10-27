import mongoose from "mongoose";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import {
  AuditLog,
  Inventory,
  InventoryMovement,
  Notification,
  OperationsEvent,
  Product,
  PurchaseOrder,
  Shipment,
  Supplier,
  Warehouse
} from "../models/Operations.js";
import HttpError from "../utils/HttpError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { applyStockAdjustment } from "../services/stockAdjustments.js";
import {
  requireDate,
  requireObject,
  requirePositiveNumber,
  assertRole,
  requireOptionalText,
  requireText,
  requireValidId
} from "../validators/operations.js";

const BUYER_ROLES = ["admin", "manufacturer"];
const STOCK_ROLES = ["admin", "manufacturer", "warehouse_manager"];
const orgId = (request) => request.user.organization._id ?? request.user.organization.id;
const userId = (request) => request.user._id;
const isRole = (request, roles) => roles.includes(request.user.role);
const MAX_PAGE_SIZE = 100;
const respond = (response, status, message, data) =>
  response.status(status).json({ success: true, message, data });

function pagination(request, defaultSort, allowedSort) {
  const page = request.query.page === undefined ? 1 : Number(request.query.page);
  const limit = request.query.limit === undefined ? 20 : Number(request.query.limit);
  if (!Number.isSafeInteger(page) || page < 1) throw new HttpError(400, "Page must be a positive integer.");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new HttpError(400, `Page size must be an integer from 1 to ${MAX_PAGE_SIZE}.`);
  }
  const sortBy = request.query.sort ?? defaultSort;
  const direction = request.query.order ?? "asc";
  if (!allowedSort.includes(sortBy)) throw new HttpError(400, "Choose a supported sort field.");
  if (!["asc", "desc"].includes(direction)) throw new HttpError(400, "Sort order must be 'asc' or 'desc'.");
  const search = request.query.q;
  if (search !== undefined && (typeof search !== "string" || search.length > 100)) {
    throw new HttpError(400, "Search text must be at most 100 characters.");
  }
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sort: { [sortBy]: direction === "asc" ? 1 : -1 },
    search: search?.trim()
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pageInfo(page, limit, total) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}

function requireRole(request, roles) {
  assertRole(request.user.role, roles);
}

async function ensureOwned(Model, id, organization, label) {
  const record = await Model.findOne({ _id: id, organization });
  if (!record) throw new HttpError(404, `${label} was not found.`);
  return record;
}

async function logAction(request, action, entityType, entity, details = {}) {
  await AuditLog.create({
    organization: orgId(request),
    actor: userId(request),
    action,
    entityType,
    entity: entity._id ?? entity,
    details
  });
}

async function addEvent(request, entityType, entity, name, detail) {
  await OperationsEvent.create({
    organization: orgId(request),
    entityType,
    entity: entity._id ?? entity,
    name,
    detail,
    actor: userId(request)
  });
}

async function notifyOrganization(organization, type, message) {
  const recipients = await User.find({ organization }).select("_id").lean();
  if (recipients.length) {
    await Notification.insertMany(recipients.map(({ _id }) => ({
      organization,
      recipient: _id,
      type,
      message
    })));
  }
}

export const listSuppliers = asyncHandler(async (request, response) => {
  const page = pagination(request, "name", ["name", "createdAt"]);
  const filter = { organization: orgId(request) };
  if (page.search) {
    const query = new RegExp(escapeRegex(page.search), "i");
    filter.$or = [{ name: query }, { contactName: query }, { email: query }];
  }
  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort(page.sort).skip(page.skip).limit(page.limit),
    Supplier.countDocuments(filter)
  ]);
  respond(response, 200, "Suppliers retrieved.", { suppliers, pagination: pageInfo(page.page, page.limit, total) });
});

export const createSupplier = asyncHandler(async (request, response) => {
  requireRole(request, BUYER_ROLES);
  const { name, contactName, email, phone, address, participantOrganization } = request.body ?? {};
  requireText(name, "Supplier name");
  requireOptionalText(contactName, "Contact name", 120);
  requireOptionalText(email, "Supplier email", 254);
  requireOptionalText(phone, "Supplier phone", 40);
  requireOptionalText(address, "Supplier address", 500);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new HttpError(400, "Supplier email must be valid.");
  }
  if (participantOrganization !== undefined) {
    requireValidId(participantOrganization, "Participant organization");
    if (!(await Organization.exists({ _id: participantOrganization }))) {
      throw new HttpError(400, "Participant organization was not found.");
    }
  }
  const supplier = await Supplier.create({
    organization: orgId(request),
    name: name.trim(),
    contactName,
    email,
    phone,
    address,
    participantOrganization
  });
  await logAction(request, "supplier.created", "supplier", supplier);
  respond(response, 201, "Supplier created.", { supplier });
});

export const listProducts = asyncHandler(async (request, response) => {
  const page = pagination(request, "name", ["name", "sku", "createdAt"]);
  const filter = { organization: orgId(request) };
  if (page.search) {
    const query = new RegExp(escapeRegex(page.search), "i");
    filter.$or = [{ name: query }, { sku: query }, { description: query }];
  }
  const [products, total] = await Promise.all([
    Product.find(filter).sort(page.sort).skip(page.skip).limit(page.limit),
    Product.countDocuments(filter)
  ]);
  respond(response, 200, "Products retrieved.", { products, pagination: pageInfo(page.page, page.limit, total) });
});

export const createProduct = asyncHandler(async (request, response) => {
  requireRole(request, BUYER_ROLES);
  const { sku, name, description, unit, reorderPoint = 0 } = request.body ?? {};
  requireText(sku, "SKU", 80);
  requireText(name, "Product name");
  requireText(unit, "Unit", 32);
  requireOptionalText(description, "Product description", 1000);
  requirePositiveNumber(reorderPoint, "Reorder point", { allowZero: true });
  let product;
  try {
    product = await Product.create({
      organization: orgId(request),
      sku,
      name,
      description,
      unit,
      reorderPoint
    });
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, "A product with this SKU already exists.");
    throw error;
  }
  await logAction(request, "product.created", "product", product);
  respond(response, 201, "Product created.", { product });
});

export const listWarehouses = asyncHandler(async (request, response) => {
  const page = pagination(request, "name", ["name", "code", "createdAt"]);
  const filter = { organization: orgId(request) };
  if (page.search) {
    const query = new RegExp(escapeRegex(page.search), "i");
    filter.$or = [{ name: query }, { code: query }, { address: query }];
  }
  const [warehouses, total] = await Promise.all([
    Warehouse.find(filter).sort(page.sort).skip(page.skip).limit(page.limit),
    Warehouse.countDocuments(filter)
  ]);
  respond(response, 200, "Warehouses retrieved.", { warehouses, pagination: pageInfo(page.page, page.limit, total) });
});

export const createWarehouse = asyncHandler(async (request, response) => {
  requireRole(request, ["admin", "manufacturer", "warehouse_manager"]);
  const { name, code, address } = request.body ?? {};
  requireText(name, "Warehouse name");
  requireText(code, "Warehouse code", 80);
  requireOptionalText(address, "Warehouse address", 500);
  let warehouse;
  try {
    warehouse = await Warehouse.create({ organization: orgId(request), name, code, address });
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, "A warehouse with this code already exists.");
    throw error;
  }
  await logAction(request, "warehouse.created", "warehouse", warehouse);
  respond(response, 201, "Warehouse created.", { warehouse });
});

export const listInventory = asyncHandler(async (request, response) => {
  const filter = { organization: orgId(request) };
  if (request.query.warehouse) {
    requireValidId(request.query.warehouse, "Warehouse");
    filter.warehouse = request.query.warehouse;
  }
  if (request.query.product) {
    requireValidId(request.query.product, "Product");
    filter.product = request.query.product;
  }
  const inventory = await Inventory.find(filter)
    .populate("product", "sku name unit reorderPoint")
    .populate("warehouse", "name code")
    .sort({ updatedAt: -1 });
  respond(response, 200, "Inventory retrieved.", { inventory });
});

export const moveInventory = asyncHandler(async (request, response) => {
  requireRole(request, STOCK_ROLES);
  const { product: productId, warehouse: warehouseId, direction, quantity, reason } = request.body ?? {};
  requireValidId(productId, "Product");
  requireValidId(warehouseId, "Warehouse");
  requirePositiveNumber(quantity, "Quantity", { minimum: 0.000001 });
  requireOptionalText(reason, "Movement reason", 300);
  if (!["in", "out"].includes(direction)) {
    throw new HttpError(400, "Direction must be either 'in' or 'out'.");
  }

  const organization = orgId(request);
  await Promise.all([
    ensureOwned(Product, productId, organization, "Product"),
    ensureOwned(Warehouse, warehouseId, organization, "Warehouse")
  ]);
  const { inventory, movement } = await applyStockAdjustment({
    organization,
    product: productId,
    warehouse: warehouseId,
    quantity,
    direction,
    reason,
    userId: userId(request)
  });
  await addEvent(request, "inventory", inventory, `stock.${direction}`, reason);
  await logAction(request, `inventory.${direction}`, "inventory", inventory, { quantity, movement: movement._id });
  const product = await Product.findById(productId).select("name reorderPoint");
  if (product && product.reorderPoint > 0 && inventory.quantity <= product.reorderPoint) {
    const recipients = await User.find({
      organization,
      role: { $in: ["admin", "manufacturer", "warehouse_manager"] }
    }).select("_id").lean();
    if (recipients.length) {
      await Notification.insertMany(recipients.map(({ _id }) => ({
        organization,
        recipient: _id,
        type: "inventory.low_stock",
        message: `${product.name} is at or below its reorder point.`
      })));
    }
  }
  respond(response, 201, "Stock movement recorded.", { inventory, movement });
});

export const getReorderSuggestions = asyncHandler(async (request, response) => {
  const organization = orgId(request);
  const [products, totals] = await Promise.all([
    Product.find({ organization, active: true, reorderPoint: { $gt: 0 } }).lean(),
    Inventory.aggregate([
      { $match: { organization: new mongoose.Types.ObjectId(organization) } },
      { $group: { _id: "$product", quantity: { $sum: "$quantity" } } }
    ])
  ]);
  const quantities = new Map(totals.map(({ _id, quantity }) => [String(_id), quantity]));
  const suggestions = products.flatMap((product) => {
    const quantity = quantities.get(String(product._id)) ?? 0;
    return quantity < product.reorderPoint
      ? [{ product, quantity, reorderPoint: product.reorderPoint, suggestedQuantity: product.reorderPoint - quantity }]
      : [];
  });
  respond(response, 200, "Reorder suggestions retrieved.", { suggestions });
});

export const listPurchaseOrders = asyncHandler(async (request, response) => {
  const organization = orgId(request);
  const page = pagination(request, "createdAt", ["createdAt", "status"]);
  const filter = {
    $or: [{ buyerOrganization: organization }, { supplierOrganization: organization }]
  };
  if (page.search) {
    const query = new RegExp(escapeRegex(page.search), "i");
    filter.$and = [{ $or: [{ notes: query }, { "items.name": query }, { "items.sku": query }] }];
  }
  if (request.query.status !== undefined) {
    if (!["draft", "submitted", "approved", "rejected", "confirmed"].includes(request.query.status)) {
      throw new HttpError(400, "Choose a supported purchase-order status.");
    }
    filter.status = request.query.status;
  }
  const [orders, total] = await Promise.all([
    PurchaseOrder.find(filter).populate("supplier", "name").populate("items.product", "sku name unit")
      .sort(page.sort).skip(page.skip).limit(page.limit),
    PurchaseOrder.countDocuments(filter)
  ]);
  respond(response, 200, "Purchase orders retrieved.", {
    purchaseOrders: orders,
    pagination: pageInfo(page.page, page.limit, total)
  });
});

export const createPurchaseOrder = asyncHandler(async (request, response) => {
  requireRole(request, BUYER_ROLES);
  const { supplier: supplierId, items, notes } = request.body ?? {};
  requireOptionalText(notes, "Purchase order notes", 2000);
  requireValidId(supplierId, "Supplier");
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new HttpError(400, "A purchase order must contain between 1 and 100 items.");
  }
  const supplier = await ensureOwned(Supplier, supplierId, orgId(request), "Supplier");
  const orderItems = [];
  for (const item of items) {
    requireObject(item, ["product", "quantity", "unitPrice"]);
    requireValidId(item.product, "Item product");
    requirePositiveNumber(item.quantity, "Item quantity", { minimum: 0.000001 });
    requirePositiveNumber(item.unitPrice, "Unit price", { allowZero: true });
    const product = await ensureOwned(Product, item.product, orgId(request), "Product");
    orderItems.push({
      product: product._id,
      sku: product.sku,
      name: product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    });
  }
  if (!supplier.participantOrganization) {
    throw new HttpError(400, "Assign a participant organization to the supplier before ordering.");
  }
  if (!(await User.exists({ organization: supplier.participantOrganization, role: "supplier" }))) {
    throw new HttpError(400, "The supplier organization has no supplier account.");
  }
  const order = await PurchaseOrder.create({
    buyerOrganization: orgId(request),
    supplierOrganization: supplier.participantOrganization,
    supplier: supplier._id,
    createdBy: userId(request),
    items: orderItems,
    notes
  });
  await logAction(request, "purchase_order.created", "purchase_order", order);
  respond(response, 201, "Purchase order created as a draft.", { purchaseOrder: order });
});

const ORDER_TRANSITIONS = {
  submitted: "draft",
  approved: "submitted",
  rejected: "submitted",
  confirmed: "approved"
};

export const transitionPurchaseOrder = asyncHandler(async (request, response) => {
  const { id } = request.params;
  requireValidId(id, "Purchase order");
  const { status, note } = request.body ?? {};
  requireOptionalText(note, "Transition note", 500);
  if (!Object.hasOwn(ORDER_TRANSITIONS, status)) {
    throw new HttpError(400, "Status must be submitted, approved, rejected, or confirmed.");
  }

  const organization = orgId(request);
  const order = await PurchaseOrder.findOne({
    _id: id,
    $or: [{ buyerOrganization: organization }, { supplierOrganization: organization }]
  });
  if (!order) throw new HttpError(404, "Purchase order was not found.");
  const buyerParticipant = String(order.buyerOrganization) === String(organization);
  const supplierParticipant = String(order.supplierOrganization) === String(organization);

  if (status === "submitted" && (!buyerParticipant || !isRole(request, BUYER_ROLES))) {
    throw new HttpError(403, "Only the purchasing organization can submit this order.");
  }
  if (["approved", "rejected"].includes(status) &&
      (!buyerParticipant || !isRole(request, BUYER_ROLES))) {
    throw new HttpError(403, "Only the purchasing organization can approve or reject this order.");
  }
  if (status === "confirmed" &&
      (!supplierParticipant || !isRole(request, ["admin", "supplier"]))) {
    throw new HttpError(403, "Only the participating supplier can confirm this order.");
  }
  if (order.status !== ORDER_TRANSITIONS[status]) {
    throw new HttpError(409, `A ${order.status} order cannot transition to ${status}.`);
  }
  const previous = order.status;
  const updated = await PurchaseOrder.findOneAndUpdate(
    { _id: order._id, buyerOrganization: order.buyerOrganization, status: previous },
    {
      $set: { status },
      $push: { transitions: { from: previous, to: status, by: userId(request), note, at: new Date() } }
    },
    { new: true, runValidators: true }
  );
  if (!updated) throw new HttpError(409, "The purchase order changed; refresh and try again.");
  await addEvent(request, "purchase_order", updated, `purchase_order.${status}`, note);
  await logAction(request, `purchase_order.${status}`, "purchase_order", updated, { from: previous, note });
  const otherParty = buyerParticipant ? updated.supplierOrganization : updated.buyerOrganization;
  await notifyOrganization(
    otherParty,
    `purchase_order.${status}`,
    `Purchase order ${updated._id} was ${status}.`
  );
  respond(response, 200, `Purchase order ${status}.`, { purchaseOrder: updated });
});

export const listShipments = asyncHandler(async (request, response) => {
  const organization = orgId(request);
  const page = pagination(request, "createdAt", ["createdAt", "expectedDelivery", "status"]);
  const filter = {
    $or: [
      { buyerOrganization: organization },
      { supplierOrganization: organization },
      { providerOrganization: organization }
    ]
  };
  if (page.search) {
    const query = new RegExp(escapeRegex(page.search), "i");
    filter.$and = [{
      $or: [
        { trackingNumber: query },
        { origin: query },
        { destination: query }
      ]
    }];
  }
  if (request.query.status !== undefined) {
    if (!["pending", "ready", "in_transit", "delayed", "delivered", "cancelled"].includes(request.query.status)) {
      throw new HttpError(400, "Choose a supported shipment status.");
    }
    filter.status = request.query.status;
  }
  const [shipments, total] = await Promise.all([
    Shipment.find(filter).populate("purchaseOrder", "status")
      .sort(page.sort).skip(page.skip).limit(page.limit),
    Shipment.countDocuments(filter)
  ]);
  respond(response, 200, "Shipments retrieved.", { shipments, pagination: pageInfo(page.page, page.limit, total) });
});

export const createShipment = asyncHandler(async (request, response) => {
  requireRole(request, BUYER_ROLES);
  const {
    purchaseOrder: orderId,
    providerOrganization,
    trackingNumber,
    expectedDelivery,
    origin,
    destination,
    estimatedCost
  } = request.body ?? {};
  requireValidId(orderId, "Purchase order");
  requireValidId(providerOrganization, "Logistics provider organization");
  requireText(origin, "Shipment origin", 240);
  requireText(destination, "Shipment destination", 240);
  requireOptionalText(trackingNumber, "Tracking number", 100);
  if (
    estimatedCost !== undefined &&
    (typeof estimatedCost !== "number" || !Number.isFinite(estimatedCost) || estimatedCost < 0)
  ) {
    throw new HttpError(400, "Estimated delivery cost must be a non-negative number.");
  }
  const order = await PurchaseOrder.findOne({ _id: orderId, buyerOrganization: orgId(request) });
  if (!order) throw new HttpError(404, "Purchase order was not found.");
  if (order.status !== "confirmed") {
    throw new HttpError(409, "A shipment can only be created for a confirmed purchase order.");
  }
  if (!(await Organization.exists({ _id: providerOrganization }))) {
    throw new HttpError(400, "Logistics provider organization was not found.");
  }
  if (!(await User.exists({ organization: providerOrganization, role: "logistics_provider" }))) {
    throw new HttpError(400, "The assigned organization has no logistics provider account.");
  }
  const eta = requireDate(expectedDelivery, "Expected delivery", { optional: true });
  const shipment = await Shipment.create({
    buyerOrganization: order.buyerOrganization,
    supplierOrganization: order.supplierOrganization,
    providerOrganization,
    purchaseOrder: order._id,
    assignedBy: userId(request),
    trackingNumber,
    origin: origin.trim(),
    destination: destination.trim(),
    estimatedCost,
    expectedDelivery: eta,
    timeline: [{ status: "pending", message: "Shipment created.", by: userId(request), at: new Date() }]
  });
  await addEvent(request, "shipment", shipment, "shipment.created");
  await logAction(request, "shipment.created", "shipment", shipment);
  respond(response, 201, "Shipment created.", { shipment });
});

export const updateShipmentStatus = asyncHandler(async (request, response) => {
  const { id } = request.params;
  requireValidId(id, "Shipment");
  const { status, message, expectedDelivery } = request.body ?? {};
  requireOptionalText(message, "Timeline message", 500);
  const allowedStatuses = ["ready", "in_transit", "delayed", "delivered", "cancelled"];
  if (!allowedStatuses.includes(status)) {
    throw new HttpError(400, "Status must be ready, in_transit, delayed, delivered, or cancelled.");
  }
  const organization = orgId(request);
  const shipment = await Shipment.findOne({
    _id: id,
    $or: [
      { buyerOrganization: organization },
      { supplierOrganization: organization },
      { providerOrganization: organization }
    ]
  });
  if (!shipment) throw new HttpError(404, "Shipment was not found.");
  const isBuyer = String(shipment.buyerOrganization) === String(organization);
  const isSupplier = String(shipment.supplierOrganization) === String(organization);
  const isProvider = shipment.providerOrganization &&
    String(shipment.providerOrganization) === String(organization);
  const canSetStatus =
    (status === "ready" && isSupplier && isRole(request, ["admin", "supplier"])) ||
    (["in_transit", "delayed", "delivered"].includes(status) &&
      isProvider && isRole(request, ["admin", "logistics_provider"])) ||
    (status === "cancelled" && isBuyer && isRole(request, BUYER_ROLES));
  if (!canSetStatus) {
    throw new HttpError(403, "Your organization or role cannot set this shipment status.");
  }
  const transitions = {
    pending: ["ready", "cancelled"],
    ready: ["in_transit", "cancelled"],
    in_transit: ["delayed", "delivered"],
    delayed: ["in_transit", "delivered"]
  };
  if (!transitions[shipment.status]?.includes(status)) {
    throw new HttpError(409, `A ${shipment.status} shipment cannot transition to ${status}.`);
  }
  const eta = expectedDelivery === undefined
    ? shipment.expectedDelivery
    : requireDate(expectedDelivery, "Expected delivery");
  const previous = shipment.status;
  const update = {
    $set: {
      status,
      expectedDelivery: eta,
      ...(status === "delivered" ? { actualDelivery: new Date() } : {})
    },
    $push: { timeline: { status, message, by: userId(request), at: new Date() } }
  };
  const updated = await Shipment.findOneAndUpdate(
    { _id: shipment._id, status: previous, buyerOrganization: shipment.buyerOrganization },
    update,
    { new: true, runValidators: true }
  );
  if (!updated) throw new HttpError(409, "The shipment changed; refresh and try again.");
  await addEvent(request, "shipment", updated, `shipment.${status}`, message);
  await logAction(request, `shipment.${status}`, "shipment", updated, { from: previous });
  const otherOrganizations = [
    updated.buyerOrganization,
    updated.supplierOrganization,
    updated.providerOrganization
  ].filter((participant) => participant && String(participant) !== String(organization));
  await Promise.all([...new Set(otherOrganizations.map(String))].map((participant) =>
    notifyOrganization(participant, `shipment.${status}`, `Shipment ${updated._id} is ${status}.`)
  ));
  respond(response, 200, `Shipment marked ${status}.`, { shipment: updated });
});

export const addShipmentEvent = asyncHandler(async (request, response) => {
  const { id } = request.params;
  requireValidId(id, "Shipment");
  const { message } = request.body ?? {};
  requireText(message, "Event message", 500);
  const organization = orgId(request);
  if (!isRole(request, ["admin", "manufacturer", "supplier", "logistics_provider"])) {
    throw new HttpError(403, "Your role cannot add shipment events.");
  }
  const shipment = await Shipment.findOneAndUpdate(
    {
      _id: id,
      $or: [
        { buyerOrganization: organization },
        { supplierOrganization: organization },
        { providerOrganization: organization }
      ]
    },
    { $push: { timeline: { status: "update", message, by: userId(request), at: new Date() } } },
    { new: true, runValidators: true }
  );
  if (!shipment) throw new HttpError(404, "Shipment was not found.");
  await addEvent(request, "shipment", shipment, "shipment.update", message);
  await logAction(request, "shipment.event_added", "shipment", shipment);
  respond(response, 201, "Shipment event added.", { shipment });
});

export const listNotifications = asyncHandler(async (request, response) => {
  const page = pagination(request, "createdAt", ["createdAt"]);
  const filter = {
    organization: orgId(request),
    recipient: userId(request)
  };
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort(page.sort).skip(page.skip).limit(page.limit),
    Notification.countDocuments(filter)
  ]);
  respond(response, 200, "Notifications retrieved.", { notifications, pagination: pageInfo(page.page, page.limit, total) });
});

export const listInventoryMovements = asyncHandler(async (request, response) => {
  const page = pagination(request, "createdAt", ["createdAt", "quantity", "direction"]);
  const filter = { organization: orgId(request) };
  if (request.query.product) {
    requireValidId(request.query.product, "Product");
    filter.product = request.query.product;
  }
  if (request.query.warehouse) {
    requireValidId(request.query.warehouse, "Warehouse");
    filter.warehouse = request.query.warehouse;
  }
  const [movements, total] = await Promise.all([
    InventoryMovement.find(filter)
      .populate("product", "sku name unit")
      .populate("warehouse", "name code")
      .populate("performedBy", "fullName")
      .sort(page.sort).skip(page.skip).limit(page.limit),
    InventoryMovement.countDocuments(filter)
  ]);
  respond(response, 200, "Inventory movements retrieved.", {
    movements,
    pagination: pageInfo(page.page, page.limit, total)
  });
});
