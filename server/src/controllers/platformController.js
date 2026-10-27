import mongoose from "mongoose";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import {
  Inventory,
  Product,
  PurchaseOrder,
  Shipment,
  Supplier,
  Warehouse
} from "../models/Operations.js";
import HttpError from "../utils/HttpError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { runAlgorithm, algorithmCatalog } from "../algorithms/index.js";

function organizationId(request) {
  return request.user.organization._id ?? request.user.organization.id;
}

function respond(response, status, message, data) {
  response.status(status).json({ success: true, message, data });
}

export const getOrganization = asyncHandler(async (request, response) => {
  const organization = await Organization.findById(organizationId(request)).lean();
  if (!organization) throw new HttpError(404, "Organization was not found.");
  respond(response, 200, "Organization retrieved.", {
    organization: {
      id: String(organization._id),
      name: organization.name,
      createdAt: organization.createdAt
    }
  });
});

export const updateOrganization = asyncHandler(async (request, response) => {
  if (!["admin", "manufacturer"].includes(request.user.role)) {
    throw new HttpError(403, "Only administrators and manufacturers can update organization details.");
  }
  const name = request.body?.name;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120) {
    throw new HttpError(400, "Organization name must be between 2 and 120 characters.");
  }
  const organization = await Organization.findByIdAndUpdate(
    organizationId(request),
    { $set: { name: name.trim() } },
    { new: true, runValidators: true }
  );
  if (!organization) throw new HttpError(404, "Organization was not found.");
  respond(response, 200, "Organization updated.", {
    organization: {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt
    }
  });
});

export const listPartnerOrganizations = asyncHandler(async (request, response) => {
  const role = request.params.role;
  const allowedRoles = {
    suppliers: "supplier",
    logistics: "logistics_provider"
  };
  const partnerRole = allowedRoles[role];
  if (!partnerRole) throw new HttpError(400, "Choose a supported partner directory.");

  const organizations = await User.distinct("organization", {
    role: partnerRole,
    organization: { $ne: organizationId(request) }
  });
  const partners = await Organization.find({ _id: { $in: organizations } })
    .select("name")
    .sort({ name: 1 })
    .lean();
  respond(response, 200, "Partner organizations retrieved.", {
    organizations: partners.map(({ _id, name }) => ({ id: String(_id), name }))
  });
});

export const getAdminUsers = asyncHandler(async (request, response) => {
  if (request.user.role !== "admin") {
    throw new HttpError(403, "Administrator access is required.");
  }
  const users = await User.find()
    .populate("organization", "name")
    .sort({ createdAt: -1 })
    .limit(250)
    .select("fullName email role organization createdAt")
    .lean();
  respond(response, 200, "Platform users retrieved.", {
    users: users.map((user) => ({
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organization: user.organization?.name ?? "Unknown organization",
      createdAt: user.createdAt
    })),
    limit: 250
  });
});

export const getAnalyticsOverview = asyncHandler(async (request, response) => {
  const organization = organizationId(request);
  const organizationObjectId = new mongoose.Types.ObjectId(organization);
  const [purchaseOrders, shipments, warehouses, inventory, products] = await Promise.all([
    PurchaseOrder.find({
      $or: [{ buyerOrganization: organization }, { supplierOrganization: organization }]
    }).select("status items supplier").populate("supplier", "name").lean(),
    Shipment.find({
      $or: [
        { buyerOrganization: organization },
        { supplierOrganization: organization },
        { providerOrganization: organization }
      ]
    }).select("status expectedDelivery actualDelivery").lean(),
    Warehouse.countDocuments({ organization }),
    Inventory.aggregate([
      { $match: { organization: organizationObjectId } },
      { $group: { _id: "$product", quantity: { $sum: "$quantity" } } }
    ]),
    Product.find({ organization, active: true }).select("name sku reorderPoint").lean()
  ]);
  const quantities = new Map(inventory.map((row) => [String(row._id), row.quantity]));
  const lowStock = products.flatMap((product) => {
    const quantity = quantities.get(String(product._id)) ?? 0;
    return product.reorderPoint > 0 && quantity < product.reorderPoint
      ? [{
          productId: String(product._id),
          sku: product.sku,
          name: product.name,
          quantity,
          reorderPoint: product.reorderPoint,
          suggestedQuantity: product.reorderPoint - quantity
        }]
      : [];
  });
  const ordersByStatus = Object.fromEntries(
    ["draft", "submitted", "approved", "rejected", "confirmed"].map((status) => [
      status,
      purchaseOrders.filter((order) => order.status === status).length
    ])
  );
  const suppliers = new Map();
  for (const order of purchaseOrders) {
    if (!order.supplier) continue;
    const key = String(order.supplier._id);
    const summary = suppliers.get(key) ?? {
      supplierId: key,
      name: order.supplier.name,
      observedOrders: 0,
      observedItemValue: 0
    };
    summary.observedOrders += 1;
    summary.observedItemValue += order.items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0
    );
    suppliers.set(key, summary);
  }
  const delivered = shipments.filter((shipment) => shipment.actualDelivery);
  const onTimeDeliveries = delivered.filter(
    (shipment) => !shipment.expectedDelivery || shipment.actualDelivery <= shipment.expectedDelivery
  ).length;

  respond(response, 200, "Analytics calculated from recorded workspace data.", {
    source: "live_database_records",
    generatedAt: new Date().toISOString(),
    totals: {
      purchaseOrders: purchaseOrders.length,
      shipments: shipments.length,
      warehouses,
      trackedProducts: products.length,
      lowStockProducts: lowStock.length
    },
    purchaseOrdersByStatus: ordersByStatus,
    shipmentStatus: {
      inTransit: shipments.filter((shipment) => shipment.status === "in_transit").length,
      delayed: shipments.filter((shipment) => shipment.status === "delayed").length,
      delivered: delivered.length,
      onTimeDelivered: onTimeDeliveries
    },
    lowStock,
    supplierComparison: [...suppliers.values()].map((supplier) => ({
      ...supplier,
      averageOrderValue: supplier.observedOrders
        ? Number((supplier.observedItemValue / supplier.observedOrders).toFixed(2))
        : 0,
      basis: "Observed purchase-order item prices only; not a quality or delivery score."
    }))
  });
});

export const getAlgorithmCatalog = (_request, response) => {
  respond(response, 200, "Available DAA demonstrations retrieved.", {
    algorithms: algorithmCatalog
  });
};

export const executeAlgorithm = asyncHandler(async (request, response) => {
  const { algorithm, input } = request.body ?? {};
  if (typeof algorithm !== "string" || !input || typeof input !== "object") {
    throw new HttpError(400, "Provide an algorithm ID and JSON input object.");
  }
  try {
    respond(response, 200, "Algorithm completed.", runAlgorithm(algorithm, input));
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) {
      throw new HttpError(400, error.message);
    }
    throw error;
  }
});

const demoRouteNetwork = Object.freeze({
  vertices: ["Central Hub", "North Warehouse", "East Distribution Center", "South Port"],
  directed: false,
  edges: [
    ["Central Hub", "North Warehouse", 18],
    ["Central Hub", "East Distribution Center", 24],
    ["Central Hub", "South Port", 40],
    ["North Warehouse", "East Distribution Center", 11],
    ["East Distribution Center", "South Port", 19],
    ["North Warehouse", "South Port", 33]
  ]
});

export const getDemoRouteNetwork = (_request, response) => {
  respond(response, 200, "Illustrative demonstration network retrieved.", {
    source: "illustrative_demo_network",
    networkAssumption: "Edge weights are sample distances, not live road distances or carrier quotes.",
    vertices: demoRouteNetwork.vertices,
    edges: demoRouteNetwork.edges.map(([from, to, distance]) => ({ from, to, distance }))
  });
};

export const optimizeRoute = asyncHandler(async (request, response) => {
  const { origin, destination, costPerDistance = 1 } = request.body ?? {};
  if (!demoRouteNetwork.vertices.includes(origin) || !demoRouteNetwork.vertices.includes(destination)) {
    throw new HttpError(400, "Choose a valid origin and destination from the demonstration network.");
  }
  if (
    typeof costPerDistance !== "number" ||
    !Number.isFinite(costPerDistance) ||
    costPerDistance < 0
  ) {
    throw new HttpError(400, "Cost per distance must be a non-negative number.");
  }
  const result = runAlgorithm("graph.dijkstra", {
    graph: demoRouteNetwork,
    source: origin
  }).result;
  const route = result.paths.find((path) => path.vertex === destination);
  respond(response, 200, "Route calculated from documented sample-network edge weights.", {
    source: "illustrative_demo_network",
    networkAssumption: "Edge weights are sample distances, not live road distances or carrier quotes.",
    origin,
    destination,
    route: route.path,
    distance: route.distance,
    estimatedCost: route.distance === null ? null : Number((route.distance * costPerDistance).toFixed(2)),
    costPerDistance,
    unit: "sample distance units",
    complexity: "Dijkstra: O((V + E) log V) using the demonstrated priority-queue approach."
  });
});
