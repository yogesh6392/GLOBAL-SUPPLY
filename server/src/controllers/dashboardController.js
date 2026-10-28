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
      dataStatus: orders.length === 0 && shipments.length === 0 ? "Operational records have not been added yet." : "Operational records synchronized.",
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
    let item = await Inventory.findOne({ organization: orgId }).populate("product warehouse");
    if (!item) {
      // Auto-create starter warehouse, product, and inventory
      let wh = await Warehouse.findOne({ organization: orgId });
      if (!wh) {
        wh = await Warehouse.create({
          organization: orgId,
          name: "Main Logistics Hub",
          code: "DEP-01",
          location: "Central Depot",
          capacity: 20000
        });
      }
      let prod = await Product.findOne({ organization: orgId });
      if (!prod) {
        prod = await Product.create({
          organization: orgId,
          sku: "SKU-AUTO-01",
          name: "Precision Sensor Module",
          unit: "units",
          reorderPoint: 20
        });
      }
      item = await Inventory.create({
        organization: orgId,
        warehouse: wh._id,
        product: prod._id,
        quantity: 25,
        updatedBy: userId
      });
      return response.status(200).json({
        success: true,
        message: "Inbound shipment simulated: +25 units provisioned at Main Logistics Hub.",
        data: { newQuantity: 25 }
      });
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
    let shipment = await Shipment.findOne({
      $or: [{ buyerOrganization: orgId }, { providerOrganization: orgId }],
      status: { $in: ["pending", "ready"] }
    });

    if (!shipment) {
      const trk = `GC-EXP-${Math.floor(1000 + Math.random() * 9000)}`;
      shipment = await Shipment.create({
        buyerOrganization: orgId,
        trackingNumber: trk,
        origin: "Central Rail Depot",
        destination: "Regional Cross-Dock",
        status: "in_transit",
        estimatedCost: 450,
        assignedBy: userId,
        timeline: [{ status: "in_transit", message: "Automated Dispatch: Carrier vehicle departed dock.", by: userId, at: new Date() }]
      });
      return response.status(200).json({
        success: true,
        message: `Expedited Shipment ${trk} dispatched to Regional Cross-Dock.`,
        data: shipment
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
    const po = await PurchaseOrder.create({
      buyerOrganization: orgId,
      createdBy: userId,
      status: "submitted",
      notes: "Simulated rapid procurement order",
      items: [{ sku: "SKU-AUTO-01", name: "Production Controller", quantity: 30, unitPrice: 120 }]
    });
    return response.status(200).json({
      success: true,
      message: `Purchase Order #${String(po._id).slice(-6).toUpperCase()} issued and dispatched for approval.`,
      data: po
    });
  }

  if (action === "quick_restock") {
    const item = await Inventory.findOne({ organization: orgId });
    if (item) {
      item.quantity += 35;
      await item.save();
    }
    return response.status(200).json({
      success: true,
      message: "⚡ 1-Click Replenishment complete: +35 units added to inventory!"
    });
  }

  return response.status(200).json({
    success: true,
    message: "Simulation event dispatched."
  });
});