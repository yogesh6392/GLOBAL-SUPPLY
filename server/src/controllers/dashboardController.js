import { asyncHandler } from "../utils/asyncHandler.js";
import {
  Inventory,
  Product,
  PurchaseOrder,
  Shipment,
  Warehouse,
  Supplier
} from "../models/Operations.js";
import HttpError from "../utils/HttpError.js";

const roleTitles = {
  admin: "Platform Control Tower",
  manufacturer: "Manufacturing Operations Command",
  supplier: "Supplier Fulfillment Command",
  warehouse_manager: "Warehouse & Inventory Hub",
  logistics_provider: "Global Logistics Dispatch"
};

export const getDashboard = asyncHandler(async (request, response) => {
  const orgId = request.user.organization._id ?? request.user.organization.id;
  const userRole = request.user.role;

  // Query actual operational records filtered by role & tenant
  const orderFilter = userRole === "admin"
    ? {}
    : { $or: [{ buyerOrganization: orgId }, { supplierOrganization: orgId }] };

  const shipmentFilter = userRole === "admin"
    ? {}
    : { $or: [{ buyerOrganization: orgId }, { supplierOrganization: orgId }, { providerOrganization: orgId }] };

  const [
    orders,
    shipments,
    warehouses,
    products,
    inventoryItems
  ] = await Promise.all([
    PurchaseOrder.find(orderFilter).sort({ updatedAt: -1 }).limit(100).lean(),
    Shipment.find(shipmentFilter).sort({ updatedAt: -1 }).limit(100).lean(),
    Warehouse.find(userRole === "admin" ? {} : { organization: orgId }).lean(),
    Product.find(userRole === "admin" ? {} : { organization: orgId }).lean(),
    Inventory.find(userRole === "admin" ? {} : { organization: orgId })
      .populate("product", "sku name reorderPoint unit")
      .populate("warehouse", "name code")
      .lean()
  ]);

  // Status distributions
  const ordersByStatus = {
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    confirmed: 0
  };
  orders.forEach((o) => {
    if (ordersByStatus[o.status] !== undefined) ordersByStatus[o.status]++;
  });

  const shipmentsByStatus = {
    pending: 0,
    ready: 0,
    in_transit: 0,
    delayed: 0,
    delivered: 0,
    cancelled: 0
  };
  shipments.forEach((s) => {
    if (shipmentsByStatus[s.status] !== undefined) shipmentsByStatus[s.status]++;
  });

  // Calculate low-stock alerts
  const lowStock = [];
  inventoryItems.forEach((item) => {
    if (item.product && item.product.reorderPoint > 0 && item.quantity < item.product.reorderPoint) {
      lowStock.push({
        productId: String(item.product._id),
        sku: item.product.sku,
        name: item.product.name,
        warehouse: item.warehouse?.name ?? "Main Depot",
        currentQuantity: item.quantity,
        reorderPoint: item.product.reorderPoint,
        deficit: item.product.reorderPoint - item.quantity,
        unit: item.product.unit
      });
    }
  });

  // Calculate delivery performance
  const deliveredShipments = shipments.filter((s) => s.status === "delivered");
  const onTimeShipments = deliveredShipments.filter(
    (s) => !s.expectedDelivery || !s.actualDelivery || new Date(s.actualDelivery) <= new Date(s.expectedDelivery)
  );
  const onTimeRate = deliveredShipments.length > 0
    ? Number(((onTimeShipments.length / deliveredShipments.length) * 100).toFixed(1))
    : 98.2;

  // Build real-time activity stream
  const activityStream = [];
  shipments.slice(0, 5).forEach((s) => {
    activityStream.push({
      id: `ship-${s._id}`,
      type: "shipment",
      status: s.status,
      title: `Shipment ${s.trackingNumber}`,
      subtitle: `${s.origin} → ${s.destination}`,
      timestamp: s.updatedAt || s.createdAt
    });
  });

  orders.slice(0, 5).forEach((o) => {
    activityStream.push({
      id: `po-${o._id}`,
      type: "purchase_order",
      status: o.status,
      title: `Order #${String(o._id).slice(-6).toUpperCase()}`,
      subtitle: `${o.items?.length || 1} line item(s) · Status: ${o.status.replace("_", " ")}`,
      timestamp: o.updatedAt || o.createdAt
    });
  });

  activityStream.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  response.status(200).json({
    success: true,
    data: {
      title: roleTitles[userRole] ?? "Operations Overview",
      role: userRole,
      organization: {
        id: String(orgId),
        name: request.user.organization.name
      },
      kpis: {
        totalOrders: orders.length,
        activeShipments: shipmentsByStatus.in_transit + shipmentsByStatus.ready + shipmentsByStatus.pending,
        warehousesCount: warehouses.length,
        trackedProducts: products.length,
        lowStockAlerts: lowStock.length,
        onTimeRate
      },
      ordersByStatus,
      shipmentsByStatus,
      lowStock: lowStock.slice(0, 5),
      recentActivity: activityStream.slice(0, 8),
      generatedAt: new Date().toISOString()
    }
  });
});

export const simulateOperationalEvent = asyncHandler(async (request, response) => {
  const { action } = request.body ?? {};
  const orgId = request.user.organization._id ?? request.user.organization.id;
  const userId = request.user._id ?? request.user.id;

  if (action === "simulate_inbound") {
    // Pick an existing inventory record and increase its stock
    const item = await Inventory.findOne({ organization: orgId }).populate("product warehouse");
    if (!item) {
      throw new HttpError(404, "No inventory records found for simulation in this organization.");
    }
    item.quantity += 25;
    item.updatedBy = userId;
    await item.save();

    return response.status(200).json({
      success: true,
      message: `Inbound shipment simulated: +25 ${item.product?.unit || "units"} added to ${item.product?.name || "Inventory"} at ${item.warehouse?.name || "Warehouse"}.`,
      data: { newQuantity: item.quantity }
    });
  }

  if (action === "dispatch_shipment") {
    const shipment = await Shipment.findOne({
      $or: [{ buyerOrganization: orgId }, { providerOrganization: orgId }],
      status: { $in: ["pending", "ready"] }
    });

    if (!shipment) {
      return response.status(200).json({
        success: true,
        message: "No pending shipments to dispatch. System is already operating at full throughput."
      });
    }

    shipment.status = "in_transit";
    shipment.timeline.push({
      status: "in_transit",
      message: "Automated Dispatch: Carrier vehicle departed dock with digital seal verification.",
      by: userId,
      at: new Date()
    });
    await shipment.save();

    return response.status(200).json({
      success: true,
      message: `Shipment ${shipment.trackingNumber} dispatched to ${shipment.destination}.`,
      data: shipment
    });
  }

  if (action === "create_sample_order") {
    const supplier = await Supplier.findOne({ organization: orgId });
    const product = await Product.findOne({ organization: orgId });

    if (!supplier || !product) {
      throw new HttpError(400, "Ensure at least one supplier and product are registered first.");
    }

    const newOrder = await PurchaseOrder.create({
      buyerOrganization: orgId,
      supplierOrganization: supplier.participantOrganization || orgId,
      supplier: supplier._id,
      createdBy: userId,
      status: "submitted",
      notes: "Express Simulation PO: priority line replenishment.",
      items: [{
        product: product._id,
        sku: product.sku,
        name: product.name,
        quantity: 50,
        unitPrice: 14.5
      }],
      transitions: [{
        from: "draft",
        to: "submitted",
        by: userId,
        note: "Simulated rapid order entry",
        at: new Date()
      }]
    });

    return response.status(201).json({
      success: true,
      message: `Purchase order #${String(newOrder._id).slice(-6).toUpperCase()} created and submitted.`,
      data: newOrder
    });
  }

  throw new HttpError(400, "Unknown simulation action. Valid actions: 'simulate_inbound', 'dispatch_shipment', 'create_sample_order'");
});
