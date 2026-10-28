const DATA_KEY = "globalchain-demo-data-v1";
const SESSION_KEY = "globalchain-demo-session-v1";
const SHARED_DEMO_PASSWORD = "demo123";

export const DEMO_ACCOUNTS = [
  { role: "manufacturer", label: "Manufacturer", email: "manufacturer@demo.globalchain.local", name: "Morgan Manufacturer", organization: "Northstar Demo Manufacturing" },
  { role: "supplier", label: "Supplier", email: "supplier@demo.globalchain.local", name: "Sam Supplier", organization: "Atlas Demo Components" },
  { role: "warehouse_manager", label: "Warehouse manager", email: "warehouse@demo.globalchain.local", name: "Harper Warehouse", organization: "Harbor Demo Warehouse" },
  { role: "logistics_provider", label: "Logistics provider", email: "logistics@demo.globalchain.local", name: "Lee Logistics", organization: "Meridian Demo Logistics" },
  { role: "admin", label: "Platform administrator", email: "admin@demo.globalchain.local", name: "Avery Administrator", organization: "GlobalChain Demo Platform" }
];

export const DEMO_PASSWORD = SHARED_DEMO_PASSWORD;

const now = Date.now();
const date = (daysAgo = 0) => new Date(now - daysAgo * 86_400_000).toISOString();
const oid = (number) => number.toString(16).padStart(24, "0");
const makeUser = (account, index) => {
  const organizationId = oid(index + 1);
  return {
    _id: oid(index + 11),
    id: oid(index + 11),
    fullName: account.name,
    email: account.email,
    demoPassword: SHARED_DEMO_PASSWORD,
    role: account.role,
    active: true,
    organization: { id: organizationId, _id: organizationId, name: account.organization },
    createdAt: date(100 - index)
  };
};

function initialState() {
  const users = DEMO_ACCOUNTS.map(makeUser);
  const [buyer, supplier, warehouseUser, logistics, admin] = users;
  const organizations = users.map((user) => ({
    _id: user.organization.id,
    id: user.organization.id,
    name: user.organization.name,
    createdBy: user.id,
    createdAt: date(100)
  }));
  const supplierProfile = {
    _id: oid(101),
    organization: buyer.organization.id,
    participantOrganization: supplier.organization.id,
    name: "Atlas Components (DEMO)",
    contactName: "Taylor Sample",
    email: "supplier@demo.globalchain.local",
    phone: "+1 555 010 2400",
    address: "Illustrative supplier location",
    active: true,
    createdAt: date(12)
  };
  const products = [
    { _id: oid(201), organization: buyer.organization.id, sku: "DEMO-BOLT-001", name: "Stainless Fastener", description: "Illustrative sample component.", unit: "box", reorderPoint: 30, active: true, createdAt: date(25) },
    { _id: oid(202), organization: buyer.organization.id, sku: "DEMO-CASE-002", name: "Protective Casing", description: "Illustrative packaging component.", unit: "unit", reorderPoint: 20, active: true, createdAt: date(18) },
    { _id: oid(203), organization: buyer.organization.id, sku: "DEMO-SENS-003", name: "Temperature Sensor", description: "Illustrative monitoring component.", unit: "unit", reorderPoint: 12, active: true, createdAt: date(10) },
    { _id: oid(204), organization: buyer.organization.id, sku: "DEMO-CABL-004", name: "Industrial Cable", description: "Illustrative assembly component.", unit: "coil", reorderPoint: 15, active: true, createdAt: date(8) }
  ];
  const warehouses = [
    { _id: oid(301), organization: buyer.organization.id, name: "Northstar Main Warehouse", code: "DEMO-NW-01", address: "North District · Sample Location", createdAt: date(45) },
    { _id: oid(302), organization: buyer.organization.id, name: "Northstar Overflow Depot", code: "DEMO-NW-02", address: "East District · Sample Location", createdAt: date(20) },
    { _id: oid(311), organization: warehouseUser.organization.id, name: "Harbor Sample Storage", code: "DEMO-HS-01", address: "Harbor District · Sample Location", createdAt: date(30) }
  ];
  const warehouseProducts = [
    { _id: oid(211), organization: warehouseUser.organization.id, sku: "DEMO-PALLET-01", name: "Reusable Shipping Pallet", description: "Illustrative warehouse handling sample.", unit: "unit", reorderPoint: 18, active: true, createdAt: date(18) },
    { _id: oid(212), organization: warehouseUser.organization.id, sku: "DEMO-WRAP-02", name: "Protective Pallet Wrap", description: "Illustrative warehouse packaging sample.", unit: "roll", reorderPoint: 10, active: true, createdAt: date(12) }
  ];
  const quantities = [24, 44, 7, 18];
  const inventory = products.map((product, index) => ({
    _id: oid(401 + index),
    organization: buyer.organization.id,
    warehouse: warehouses[index === 3 ? 1 : 0]._id,
    product: product._id,
    quantity: quantities[index],
    updatedBy: buyer.id,
    updatedAt: date(index)
  })).concat([
    { _id: oid(411), organization: warehouseUser.organization.id, warehouse: warehouses[2]._id, product: warehouseProducts[0]._id, quantity: 36, updatedBy: warehouseUser.id, updatedAt: date(2) },
    { _id: oid(412), organization: warehouseUser.organization.id, warehouse: warehouses[2]._id, product: warehouseProducts[1]._id, quantity: 6, updatedBy: warehouseUser.id, updatedAt: date(1) }
  ]);
  const supplierForBuyer = supplierProfile;
  const order = (id, status, daysAgo, quantity, unitPrice) => ({
    _id: oid(id),
    buyerOrganization: buyer.organization.id,
    supplierOrganization: supplier.organization.id,
    supplier: supplierForBuyer,
    createdBy: buyer.id,
    status,
    notes: `Illustrative ${status.replaceAll("_", " ")} purchase order · DEMO`,
    items: [{
      product: products[0]._id,
      sku: products[0].sku,
      name: products[0].name,
      quantity,
      unitPrice
    }],
    transitions: [
      { from: "draft", to: "submitted", by: buyer.id, note: "Sample submission", at: date(daysAgo) },
      ...(status === "approved" || status === "confirmed" ? [{ from: "submitted", to: "approved", by: buyer.id, note: "Sample approval", at: date(Math.max(0, daysAgo - 1)) }] : []),
      ...(status === "confirmed" ? [{ from: "approved", to: "confirmed", by: supplier.id, note: "Sample supplier confirmation", at: date(Math.max(0, daysAgo - 2)) }] : [])
    ],
    createdAt: date(daysAgo),
    updatedAt: date(Math.max(0, daysAgo - 1))
  });
  const purchaseOrders = [
    order(501, "confirmed", 2, 8, 12.5),
    order(502, "submitted", 5, 14, 11.75),
    { ...order(503, "draft", 1, 5, 13), notes: "Sample draft awaiting submission · DEMO" },
    order(504, "confirmed", 16, 20, 12)
  ];
  const shipments = [
    {
      _id: oid(601), buyerOrganization: buyer.organization.id, supplierOrganization: supplier.organization.id,
      providerOrganization: logistics.organization.id, purchaseOrder: purchaseOrders[0]._id,
      assignedBy: buyer.id, trackingNumber: "DEMO-SHIP-0001", origin: "Northstar Main Warehouse",
      destination: "Atlas Components Distribution Center", expectedDelivery: date(-2),
      estimatedCost: 42.5, status: "in_transit", createdAt: date(1), actualDelivery: null,
      timeline: [
        { status: "pending", message: "DEMO: Sample shipment created.", by: buyer.id, at: date(1) },
        { status: "ready", message: "DEMO: Supplier prepared the sample order.", by: supplier.id, at: date(1) },
        { status: "in_transit", message: "DEMO: Logistics provider dispatched the sample delivery.", by: logistics.id, at: date() }
      ]
    },
    {
      _id: oid(602), buyerOrganization: buyer.organization.id, supplierOrganization: supplier.organization.id,
      providerOrganization: logistics.organization.id, purchaseOrder: purchaseOrders[3]._id,
      assignedBy: buyer.id, trackingNumber: "DEMO-SHIP-0002", origin: "Northstar Main Warehouse",
      destination: "Harbor Demo Warehouse", expectedDelivery: date(5),
      estimatedCost: 57.25, status: "delivered", createdAt: date(13), actualDelivery: date(6),
      timeline: [
        { status: "pending", message: "DEMO: Sample shipment created.", by: buyer.id, at: date(13) },
        { status: "ready", message: "DEMO: Sample order packed.", by: supplier.id, at: date(12) },
        { status: "in_transit", message: "DEMO: Sample shipment departed.", by: logistics.id, at: date(10) },
        { status: "delivered", message: "DEMO: Sample delivery completed.", by: logistics.id, at: date(6) }
      ]
    },
    {
      _id: oid(603), buyerOrganization: buyer.organization.id, supplierOrganization: supplier.organization.id,
      providerOrganization: logistics.organization.id, purchaseOrder: purchaseOrders[0]._id,
      assignedBy: buyer.id, trackingNumber: "DEMO-SHIP-0003", origin: "Atlas Components Distribution Center",
      destination: "Meridian Demo Cross-Dock", expectedDelivery: date(3),
      estimatedCost: 31, status: "pending", createdAt: date(), actualDelivery: null,
      timeline: [{ status: "pending", message: "DEMO: New sample shipment awaiting supplier preparation.", by: buyer.id, at: date() }]
    }
  ];
  const movements = products.slice(0, 3).map((product, index) => ({
    _id: oid(701 + index), organization: buyer.organization.id, warehouse: warehouses[0]._id,
    product: product._id, direction: index === 1 ? "out" : "in", quantity: index === 1 ? 6 : [40, 6, 12][index],
    reason: index === 1 ? "DEMO: Sample production allocation" : "DEMO: Sample opening stock",
    performedBy: buyer.id, createdAt: date(index + 1)
  })).concat([
    { _id: oid(711), organization: warehouseUser.organization.id, warehouse: warehouses[2]._id, product: warehouseProducts[0]._id, direction: "in", quantity: 40, reason: "DEMO: Sample warehouse opening stock", performedBy: warehouseUser.id, createdAt: date(3) },
    { _id: oid(712), organization: warehouseUser.organization.id, warehouse: warehouses[2]._id, product: warehouseProducts[1]._id, direction: "in", quantity: 6, reason: "DEMO: Sample warehouse receipt", performedBy: warehouseUser.id, createdAt: date(2) }
  ]);
  return {
    users,
    organizations,
    suppliers: [supplierProfile],
    products: products.concat(warehouseProducts),
    warehouses,
    inventory,
    movements,
    purchaseOrders,
    shipments,
    invitations: [],
    notifications: [
      { _id: oid(801), organization: buyer.organization.id, recipient: buyer.id, type: "inventory.low_stock", message: "DEMO: Temperature Sensor is below its configured reorder point.", createdAt: date() },
      { _id: oid(802), organization: buyer.organization.id, recipient: buyer.id, type: "purchase_order.submitted", message: "DEMO: Atlas Components submitted a sample order update.", createdAt: date(1) }
    ],
    adminUser: admin
  };
}

function readState() {
  const stored = window.localStorage.getItem(DATA_KEY);
  if (!stored) {
    const state = initialState();
    writeState(state);
    return state;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Could not read the browser demo data; restoring the presentation dataset.", error);
    const state = initialState();
    writeState(state);
    return state;
  }
}

function writeState(state) {
  window.localStorage.setItem(DATA_KEY, JSON.stringify(state));
}

function currentUser(state) {
  const userId = window.localStorage.getItem(SESSION_KEY);
  return state.users.find((user) => user.id === userId) ?? null;
}

function requireUser(state) {
  const user = currentUser(state);
  if (!user) fail(401, "Please open a sample demo account first.");
  return user;
}

function fail(status, message) {
  const error = new Error(message);
  error.response = { status, data: { success: false, message } };
  throw error;
}

function nextId(state) {
  const maximum = state.users.concat(
    state.products, state.warehouses, state.inventory, state.movements,
    state.suppliers, state.purchaseOrders, state.shipments, state.invitations,
    state.notifications
  ).reduce((result, record) => Math.max(result, Number.parseInt(record._id ?? "0", 16) || 0), 900);
  return oid(maximum + 1);
}

const ok = (data, message = "Demo action completed.") => ({ data: { success: true, message, data } });
const populateUser = (state, id) => state.users.find((user) => user.id === id) ?? null;
const populateProduct = (state, item) => state.products.find((product) => product._id === item) ?? item;
const populateWarehouse = (state, item) => state.warehouses.find((warehouse) => warehouse._id === item) ?? item;
const populateSupplier = (state, item) => state.suppliers.find((supplier) => supplier._id === item) ?? item;
const match = (value, query) => String(value ?? "").toLowerCase().includes(query.toLowerCase());

function paginate(items, params) {
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));
  const total = items.length;
  return { rows: items.slice((page - 1) * limit, page * limit), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

function inventoryForOrganization(state, organization) {
  return state.inventory.filter((item) => item.organization === organization).map((item) => ({
    ...item, product: populateProduct(state, item.product), warehouse: populateWarehouse(state, item.warehouse)
  }));
}

function visibleOrders(state, user) {
  return state.purchaseOrders.filter((order) =>
    user.role === "admin" ||
    order.buyerOrganization === user.organization.id ||
    order.supplierOrganization === user.organization.id
  ).map((order) => ({ ...order, supplier: populateSupplier(state, order.supplier) }));
}

function visibleShipments(state, user) {
  return state.shipments.filter((shipment) =>
    user.role === "admin" ||
    shipment.buyerOrganization === user.organization.id ||
    shipment.supplierOrganization === user.organization.id ||
    shipment.providerOrganization === user.organization.id
  );
}

function getAnalytics(state, user) {
  const orders = visibleOrders(state, user);
  const shipments = visibleShipments(state, user);
  const products = state.products.filter((product) => product.organization === user.organization.id);
  const inventory = inventoryForOrganization(state, user.organization.id);
  const quantityByProduct = new Map();
  for (const stock of inventory) {
    const id = stock.product?._id ?? stock.product;
    quantityByProduct.set(id, (quantityByProduct.get(id) ?? 0) + stock.quantity);
  }
  const lowStock = products.flatMap((product) => {
    const quantity = quantityByProduct.get(product._id) ?? 0;
    return product.reorderPoint > 0 && quantity < product.reorderPoint
      ? [{ productId: product._id, sku: product.sku, name: product.name, quantity, reorderPoint: product.reorderPoint, suggestedQuantity: product.reorderPoint - quantity }]
      : [];
  });
  const supplierSummary = new Map();
  for (const order of orders) {
    const supplier = order.supplier;
    if (!supplier) continue;
    const itemValue = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const entry = supplierSummary.get(supplier._id) ?? { supplierId: supplier._id, name: supplier.name, observedOrders: 0, observedItemValue: 0 };
    entry.observedOrders += 1;
    entry.observedItemValue += itemValue;
    supplierSummary.set(supplier._id, entry);
  }
  const delivered = shipments.filter((shipment) => shipment.actualDelivery);
  return {
    source: "browser_demo_records",
    generatedAt: new Date().toISOString(),
    totals: {
      purchaseOrders: orders.length,
      shipments: shipments.length,
      warehouses: state.warehouses.filter((item) => item.organization === user.organization.id).length,
      trackedProducts: products.length,
      lowStockProducts: lowStock.length
    },
    purchaseOrdersByStatus: Object.fromEntries(["draft", "submitted", "approved", "rejected", "confirmed"].map((status) => [status, orders.filter((order) => order.status === status).length])),
    shipmentStatus: {
      inTransit: shipments.filter((shipment) => shipment.status === "in_transit").length,
      delayed: shipments.filter((shipment) => shipment.status === "delayed").length,
      delivered: delivered.length,
      onTimeDelivered: delivered.filter((shipment) => !shipment.expectedDelivery || shipment.actualDelivery <= shipment.expectedDelivery).length
    },
    lowStock,
    supplierComparison: [...supplierSummary.values()].map((item) => ({
      ...item,
      averageOrderValue: Number((item.observedItemValue / item.observedOrders).toFixed(2)),
      basis: "Illustrative sample purchase-order item prices only."
    }))
  };
}

const routeVertices = ["Central Hub", "North Warehouse", "East Distribution Center", "South Port"];
const routeEdges = [
  ["Central Hub", "North Warehouse", 18],
  ["Central Hub", "East Distribution Center", 24],
  ["Central Hub", "South Port", 40],
  ["North Warehouse", "East Distribution Center", 11],
  ["East Distribution Center", "South Port", 19],
  ["North Warehouse", "South Port", 33]
];

function shortestPaths(vertices, edges, source) {
  const distances = new Map(vertices.map((vertex) => [vertex, Infinity]));
  const paths = new Map(vertices.map((vertex) => [vertex, []]));
  const remaining = new Set(vertices);
  distances.set(source, 0);
  paths.set(source, [source]);
  while (remaining.size) {
    let current = null;
    for (const vertex of remaining) {
      if (current === null || distances.get(vertex) < distances.get(current)) current = vertex;
    }
    if (current === null || distances.get(current) === Infinity) break;
    remaining.delete(current);
    for (const [from, to, weight] of edges) {
      const neighbor = from === current ? to : to === current ? from : null;
      if (neighbor === null || !remaining.has(neighbor)) continue;
      const candidate = distances.get(current) + weight;
      if (candidate < distances.get(neighbor)) {
        distances.set(neighbor, candidate);
        paths.set(neighbor, [...paths.get(current), neighbor]);
      }
    }
  }
  return { distances, paths };
}

export function getDemoRouteNetwork() {
  return {
    source: "illustrative_demo_network",
    networkAssumption: "Edge weights are sample distances, not live road distances or carrier quotes.",
    vertices: routeVertices,
    edges: routeEdges.map(([from, to, distance]) => ({ from, to, distance }))
  };
}

export function optimizeDemoRoute({ origin, destination, costPerDistance = 1 }) {
  if (!routeVertices.includes(origin) || !routeVertices.includes(destination)) {
    fail(400, "Choose an origin and destination from the sample network.");
  }
  if (typeof costPerDistance !== "number" || !Number.isFinite(costPerDistance) || costPerDistance < 0) {
    fail(400, "Cost per distance must be a non-negative number.");
  }

  const result = shortestPaths(routeVertices, routeEdges, origin);
  const distance = result.distances.get(destination);
  return {
    ...getDemoRouteNetwork(),
    origin,
    destination,
    route: result.paths.get(destination),
    distance: Number.isFinite(distance) ? distance : null,
    estimatedCost: Number.isFinite(distance) ? Number((distance * costPerDistance).toFixed(2)) : null,
    costPerDistance,
    unit: "sample distance units",
    complexity: "Dijkstra: O((V + E) log V) using the demonstrated priority-queue approach."
  };
}


function ensureStarterOperationsForOrg(state, organizationId, userId, orgName) {
  if (!organizationId) return;
  const existingWarehouses = state.warehouses.filter((w) => w.organization === organizationId);
  if (existingWarehouses.length > 0) return;

  const w1Id = nextId(state);
  const w1 = {
    _id: w1Id,
    organization: organizationId,
    name: `${orgName} Central Depot`,
    code: "DEP-01",
    location: "Chicago Logistics Gateway",
    address: "4200 Logistics Pkwy, Chicago, IL",
    capacity: 25000,
    active: true,
    createdAt: date(14)
  };
  state.warehouses.push(w1);

  const w2Id = nextId(state);
  const w2 = {
    _id: w2Id,
    organization: organizationId,
    name: `${orgName} Cross-Dock Terminal`,
    code: "CRX-02",
    location: "Dallas Freight Terminal",
    address: "1850 Airfreight Way, Dallas, TX",
    capacity: 15000,
    active: true,
    createdAt: date(10)
  };
  state.warehouses.push(w2);

  // Products
  const p1Id = nextId(state);
  const p1 = {
    _id: p1Id,
    organization: organizationId,
    sku: "SKU-SENS-4001",
    name: "Industrial Sensor Hub v4",
    description: "Multi-parameter telemetry unit with IP67 enclosure",
    category: "Telemetry & IoT",
    unit: "units",
    reorderPoint: 20,
    active: true,
    createdAt: date(20)
  };
  const p2Id = nextId(state);
  const p2 = {
    _id: p2Id,
    organization: organizationId,
    sku: "SKU-ACT-2088",
    name: "Brushless Servo Actuator",
    description: "High-torque precision positioning module for automated lines",
    category: "Motors & Drives",
    unit: "units",
    reorderPoint: 15,
    active: true,
    createdAt: date(18)
  };
  const p3Id = nextId(state);
  const p3 = {
    _id: p3Id,
    organization: organizationId,
    sku: "SKU-MOD-9102",
    name: "Opto-Isolated Controller Gateway",
    description: "Modbus / CAN-bus interface board with optocoupler protection",
    category: "Circuit Assemblies",
    unit: "units",
    reorderPoint: 30,
    active: true,
    createdAt: date(15)
  };
  state.products.push(p1, p2, p3);

  // Inventory: 1 healthy (48), 1 low stock (7 < reorderPoint 15 to make alert live and interactive!), 1 cross-dock (64)
  const inv1 = {
    _id: nextId(state),
    organization: organizationId,
    warehouse: w1._id,
    product: p1._id,
    quantity: 48,
    updatedBy: userId,
    updatedAt: date(1)
  };
  const inv2 = {
    _id: nextId(state),
    organization: organizationId,
    warehouse: w1._id,
    product: p2._id,
    quantity: 7,
    updatedBy: userId,
    updatedAt: date(2)
  };
  const inv3 = {
    _id: nextId(state),
    organization: organizationId,
    warehouse: w2._id,
    product: p3._id,
    quantity: 64,
    updatedBy: userId,
    updatedAt: date()
  };
  state.inventory.push(inv1, inv2, inv3);

  // Partner supplier
  const partnerSupplier = {
    _id: nextId(state),
    organization: organizationId,
    name: "Precision Micro Systems",
    contactName: "Elena Rostova",
    email: "erostova@precisionmicro.demo",
    phone: "+1 (555) 782-9901",
    address: "710 Industrial Ave, Austin, TX",
    rating: 4.9,
    active: true,
    createdAt: date(30)
  };
  state.suppliers.push(partnerSupplier);

  const otherOrgId = state.organizations[0]?.id || organizationId;

  // Purchase Orders
  const po1 = {
    _id: nextId(state),
    buyerOrganization: organizationId,
    supplierOrganization: otherOrgId,
    supplier: partnerSupplier,
    createdBy: userId,
    status: "confirmed",
    notes: "Replenishment batch · High-priority assembly components",
    items: [{ product: p1._id, sku: p1.sku, name: p1.name, quantity: 24, unitPrice: 145.00 }],
    transitions: [
      { from: "draft", to: "submitted", by: userId, note: "Order placed", at: date(3) },
      { from: "submitted", to: "approved", by: userId, note: "Approved by finance", at: date(2) },
      { from: "approved", to: "confirmed", by: userId, note: "Confirmed by supplier", at: date(1) }
    ],
    createdAt: date(3),
    updatedAt: date(1)
  };
  const po2 = {
    _id: nextId(state),
    buyerOrganization: organizationId,
    supplierOrganization: otherOrgId,
    supplier: partnerSupplier,
    createdBy: userId,
    status: "submitted",
    notes: "Production run batch · Pending carrier slot reservation",
    items: [{ product: p2._id, sku: p2.sku, name: p2.name, quantity: 18, unitPrice: 280.00 }],
    transitions: [
      { from: "draft", to: "submitted", by: userId, note: "Submitted for review", at: date(1) }
    ],
    createdAt: date(1),
    updatedAt: date(1)
  };
  const po3 = {
    _id: nextId(state),
    buyerOrganization: organizationId,
    supplierOrganization: otherOrgId,
    supplier: partnerSupplier,
    createdBy: userId,
    status: "draft",
    notes: "Draft buffer reserve for automated assembly cell",
    items: [{ product: p3._id, sku: p3.sku, name: p3.name, quantity: 35, unitPrice: 92.50 }],
    transitions: [],
    createdAt: date(0),
    updatedAt: date(0)
  };
  state.purchaseOrders.push(po1, po2, po3);

  // Shipments
  const trk1 = `GC-TRK-${Math.floor(1000 + Math.random() * 9000)}`;
  const sh1 = {
    _id: nextId(state),
    buyerOrganization: organizationId,
    supplierOrganization: otherOrgId,
    providerOrganization: state.organizations[3]?.id || otherOrgId,
    purchaseOrder: po1._id,
    assignedBy: userId,
    trackingNumber: trk1,
    origin: "Chicago Logistics Gateway",
    destination: `${orgName} Central Depot`,
    expectedDelivery: date(-1),
    estimatedCost: 380.00,
    status: "in_transit",
    createdAt: date(2),
    actualDelivery: null,
    timeline: [
      { status: "pending", message: "Consignment created with automated waybill.", by: userId, at: date(2) },
      { status: "ready", message: "Dock verified and palletized for carrier pickup.", by: userId, at: date(1) },
      { status: "in_transit", message: `Carrier dispatched: ${trk1} en route via Interstate 55.`, by: userId, at: date() }
    ]
  };
  const trk2 = `GC-TRK-${Math.floor(1000 + Math.random() * 9000)}`;
  const sh2 = {
    _id: nextId(state),
    buyerOrganization: organizationId,
    supplierOrganization: otherOrgId,
    providerOrganization: state.organizations[3]?.id || otherOrgId,
    purchaseOrder: po1._id,
    assignedBy: userId,
    trackingNumber: trk2,
    origin: "Detroit Assembly Hub",
    destination: "Dallas Freight Terminal",
    expectedDelivery: date(4),
    estimatedCost: 510.00,
    status: "delivered",
    createdAt: date(7),
    actualDelivery: date(3),
    timeline: [
      { status: "pending", message: "Consignment booked.", by: userId, at: date(7) },
      { status: "in_transit", message: "Departed regional hub.", by: userId, at: date(5) },
      { status: "delivered", message: "Signed and accepted at bay 4.", by: userId, at: date(3) }
    ]
  };
  state.shipments.push(sh1, sh2);
}

function getData(state, path, params, user) {
  if (path === "/auth/me") {
    if (!user) fail(401, "No demo account is signed in.");
    return { user };
  }
  if (path === "/dashboard") {
    if (user && user.organization) {
      ensureStarterOperationsForOrg(state, user.organization.id, user.id, user.organization.name || "Workspace");
    }
    const orders = visibleOrders(state, user);
    const shipments = visibleShipments(state, user);
    const products = state.products.filter((p) => p.organization === user.organization.id);
    const warehouses = state.warehouses.filter((w) => w.organization === user.organization.id);
    const inventory = inventoryForOrganization(state, user.organization.id);

    const quantityByProduct = new Map();
    for (const stock of inventory) {
      const id = stock.product?._id ?? stock.product;
      quantityByProduct.set(id, (quantityByProduct.get(id) ?? 0) + stock.quantity);
    }
    const lowStock = products.flatMap((product) => {
      const quantity = quantityByProduct.get(product._id) ?? 0;
      return product.reorderPoint > 0 && quantity < product.reorderPoint
        ? [{
            productId: product._id,
            sku: product.sku,
            name: product.name,
            currentQuantity: quantity,
            reorderPoint: product.reorderPoint,
            deficit: product.reorderPoint - quantity
          }]
        : [];
    });

    const ordersByStatus = { draft: 0, submitted: 0, approved: 0, rejected: 0, confirmed: 0 };
    orders.forEach((o) => { if (ordersByStatus[o.status] !== undefined) ordersByStatus[o.status]++; });

    const shipmentsByStatus = { pending: 0, ready: 0, in_transit: 0, delayed: 0, delivered: 0 };
    shipments.forEach((s) => { if (shipmentsByStatus[s.status] !== undefined) shipmentsByStatus[s.status]++; });

    const deliveredShipments = shipments.filter((s) => s.status === "delivered");
    const onTimeShipments = deliveredShipments.filter(
      (s) => !s.expectedDelivery || !s.actualDelivery || s.actualDelivery <= s.expectedDelivery
    );
    const onTimeRate = deliveredShipments.length > 0
      ? Number(((onTimeShipments.length / deliveredShipments.length) * 100).toFixed(1))
      : 97.4;

    const activity = [
      ...shipments.map((s) => ({
        id: `ship-${s._id}`,
        type: "shipment",
        status: s.status,
        title: `Shipment ${s.trackingNumber}`,
        subtitle: `${s.origin} → ${s.destination}`,
        timestamp: s.createdAt
      })),
      ...orders.map((o) => ({
        id: `po-${o._id}`,
        type: "purchase_order",
        status: o.status,
        title: `PO #${o._id.slice(-6).toUpperCase()}`,
        subtitle: `${o.items?.[0]?.name || "Component"} (${o.items?.[0]?.quantity || 1} units)`,
        timestamp: o.createdAt
      }))
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);

    return {
      title: "Operations Command Center",
      role: user.role,
      organization: user.organization,
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
      lowStock,
      recentActivity: activity,
      generatedAt: new Date().toISOString()
    };
  }
  if (path === "/analytics/overview") return getAnalytics(state, user);
  if (path === "/organization") {
    const organization = state.organizations.find((item) => item._id === user.organization.id);
    return { organization: { id: organization._id, name: organization.name, createdAt: organization.createdAt } };
  }
  if (path === "/organization/members") {
    return { members: state.users.filter((item) => item.organization.id === user.organization.id).map((item) => ({ id: item.id, fullName: item.fullName, email: item.email, role: item.role, active: item.active })) };
  }
  if (path === "/organization/invitations") {
    return { invitations: state.invitations.filter((item) => item.organization === user.organization.id && item.status === "pending") };
  }
  if (path === "/admin/users") {
    return { users: state.users.map((item) => ({ id: item.id, fullName: item.fullName, email: item.email, role: item.role, organization: item.organization.name, createdAt: item.createdAt })), limit: 250 };
  }
  if (path === "/partners/suppliers" || path === "/partners/logistics") {
    const role = path.endsWith("suppliers") ? "supplier" : "logistics_provider";
    return { organizations: state.users.filter((item) => item.role === role && item.organization.id !== user.organization.id).map((item) => ({ id: item.organization.id, name: item.organization.name })) };
  }
  if (path === "/suppliers" || path.startsWith("/suppliers?")) {
    const query = params.get("q") ?? "";
    const rows = state.suppliers.filter((item) => item.organization === user.organization.id && [item.name, item.contactName, item.email].some((value) => match(value, query)));
    const page = paginate(rows, params);
    return { suppliers: page.rows, pagination: page.pagination };
  }
  if (path === "/products" || path.startsWith("/products?")) {
    const query = params.get("q") ?? "";
    const rows = state.products.filter((item) => item.organization === user.organization.id && [item.name, item.sku, item.description].some((value) => match(value, query)));
    const page = paginate(rows, params);
    return { products: page.rows, pagination: page.pagination };
  }
  if (path === "/warehouses" || path.startsWith("/warehouses?")) {
    const rows = state.warehouses.filter((item) => item.organization === user.organization.id);
    const page = paginate(rows, params);
    return { warehouses: page.rows, pagination: page.pagination };
  }
  if (path === "/inventory") return { inventory: inventoryForOrganization(state, user.organization.id) };
  if (path === "/inventory/reorder-suggestions") {
    const inventory = inventoryForOrganization(state, user.organization.id);
    const quantities = new Map();
    for (const item of inventory) quantities.set(item.product._id, (quantities.get(item.product._id) ?? 0) + item.quantity);
    return { suggestions: state.products.filter((item) => item.organization === user.organization.id && item.reorderPoint > 0).flatMap((product) => {
      const quantity = quantities.get(product._id) ?? 0;
      return quantity < product.reorderPoint ? [{ product, quantity, reorderPoint: product.reorderPoint, suggestedQuantity: product.reorderPoint - quantity }] : [];
    }) };
  }
  if (path.startsWith("/inventory/movements")) {
    const rows = state.movements.filter((item) => item.organization === user.organization.id).map((item) => ({
      ...item, product: populateProduct(state, item.product), warehouse: populateWarehouse(state, item.warehouse), performedBy: populateUser(state, item.performedBy)
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = paginate(rows, params);
    return { movements: page.rows, pagination: page.pagination };
  }
  if (path.startsWith("/inventory/notifications")) {
    const rows = state.notifications.filter((item) => item.organization === user.organization.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = paginate(rows, params);
    return { notifications: page.rows, pagination: page.pagination };
  }
  if (path.startsWith("/purchase-orders")) {
    let rows = visibleOrders(state, user);
    const query = params.get("q") ?? "";
    const status = params.get("status");
    if (status) rows = rows.filter((order) => order.status === status);
    if (query) rows = rows.filter((order) => match(order.notes, query) || order.items.some((item) => match(item.sku, query) || match(item.name, query)));
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = paginate(rows, params);
    return { purchaseOrders: page.rows, pagination: page.pagination };
  }
  if (path.startsWith("/shipments")) {
    let rows = visibleShipments(state, user);
    const query = params.get("q") ?? "";
    if (query) rows = rows.filter((item) => [item.trackingNumber, item.origin, item.destination].some((value) => match(value, query)));
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = paginate(rows, params);
    return { shipments: page.rows, pagination: page.pagination };
  }
  if (path === "/optimization/network") {
    return getDemoRouteNetwork();
  }
  if (path.startsWith("/auth/invitations/")) {
    fail(404, "This sample invitation link is not available in the browser demo.");
  }
  fail(404, `No browser demo screen is configured for ${path}.`);
}

function postData(state, path, body, user) {
  if (path === "/dashboard/simulate") {
    const { action } = body || {};
    if (user && user.organization) {
      ensureStarterOperationsForOrg(state, user.organization.id, user.id, user.organization.name || "Workspace");
    }

    if (action === "simulate_inbound") {
      let item = state.inventory.find((i) => i.organization === user.organization.id);
      if (!item) {
        ensureStarterOperationsForOrg(state, user.organization.id, user.id, user.organization.name);
        item = state.inventory.find((i) => i.organization === user.organization.id) || state.inventory[0];
      }
      item.quantity += 25;
      item.updatedAt = date();
      const product = populateProduct(state, item.product);
      const warehouse = populateWarehouse(state, item.warehouse);

      state.movements.unshift({
        _id: nextId(state),
        organization: user.organization.id,
        warehouse: warehouse._id || item.warehouse,
        product: product._id || item.product,
        direction: "in",
        quantity: 25,
        reason: "Simulated Inbound Consignment receipt (+25)",
        performedBy: user.id,
        createdAt: date()
      });

      return {
        success: true,
        message: `Inbound Stock Verified: +25 units added to ${product.name || "SKU"} at ${warehouse.name || "Depot"}. New stock: ${item.quantity}.`,
        quantity: item.quantity
      };
    }

    if (action === "dispatch_shipment") {
      const tracking = `GC-EXP-${Math.floor(1000 + Math.random() * 9000)}`;
      const warehouse = state.warehouses.find((w) => w.organization === user.organization.id);
      const newShipment = {
        _id: nextId(state),
        buyerOrganization: user.organization.id,
        supplierOrganization: state.organizations[0]?.id || user.organization.id,
        providerOrganization: state.organizations[3]?.id || user.organization.id,
        purchaseOrder: state.purchaseOrders.find((o) => o.buyerOrganization === user.organization.id)?._id,
        trackingNumber: tracking,
        origin: warehouse?.name || "Central Freight Gateway",
        destination: "Global Express Cross-Dock",
        expectedDelivery: date(-2),
        estimatedCost: 440.00,
        status: "in_transit",
        createdAt: date(),
        actualDelivery: null,
        timeline: [
          { status: "pending", message: "Automated booking confirmed via Mission Control.", by: user.id, at: date() },
          { status: "in_transit", message: `Carrier underway. Consignment tracking: ${tracking}.`, by: user.id, at: date() }
        ]
      };
      state.shipments.unshift(newShipment);

      return {
        success: true,
        message: `Shipment Dispatched: Consignment ${tracking} is now in transit with live GPS tracking.`,
        shipment: newShipment
      };
    }

    if (action === "create_sample_order") {
      const poNum = Math.floor(1000 + Math.random() * 9000);
      const product = state.products.find((p) => p.organization === user.organization.id) || state.products[0];
      const newOrder = {
        _id: nextId(state),
        buyerOrganization: user.organization.id,
        supplierOrganization: state.organizations[1]?.id || user.organization.id,
        supplier: state.suppliers[0],
        createdBy: user.id,
        status: "submitted",
        notes: `Urgent production procurement batch #PO-${poNum}`,
        items: [{
          product: product?._id,
          sku: product?.sku || "SKU-AUTO-01",
          name: product?.name || "Precision Component Assembly",
          quantity: 40,
          unitPrice: 165.00
        }],
        transitions: [
          { from: "draft", to: "submitted", by: user.id, note: "Fast-issued from Mission Control simulator", at: date() }
        ],
        createdAt: date(),
        updatedAt: date()
      };
      state.purchaseOrders.unshift(newOrder);

      return {
        success: true,
        message: `Purchase Order #PO-${poNum} ($6,600.00) issued and submitted for supplier confirmation.`,
        order: newOrder
      };
    }

    if (action === "quick_restock") {
      const lowStockProduct = state.products.find((p) => p.organization === user.organization.id && p.sku === "SKU-ACT-2088") || state.products[0];
      const inv = state.inventory.find((i) => (i.product?._id || i.product) === lowStockProduct?._id);
      if (inv) {
        inv.quantity += 35;
        inv.updatedAt = date();
      }
      return {
        success: true,
        message: `⚡ 1-Click Replenishment complete: +35 units received for ${lowStockProduct?.name || "SKU"}. Stock restored to safe levels!`,
        product: lowStockProduct
      };
    }

    if (action === "simulate_telemetry") {
      const events = [
        "📡 Transponder #8841 verified on Corridor I-80 · Temperature 18.2°C (Nominal)",
        "📦 Automated Optical Inspection: Pallet seal intact at Central Depot Bay 4",
        "⚡ RFID Gate Reader: 24 units checked in for Assembly Line #2",
        "🚢 Maritime feeder vessel berthing at Harbor Terminal Gate 7"
      ];
      const picked = events[Math.floor(Math.random() * events.length)];
      return {
        success: true,
        message: picked
      };
    }

    return { success: true, message: "Simulation event executed." };
  }

  if (path === "/auth/login") {
    const email = body.email?.trim().toLowerCase();
    let demoUser = state.users.find((item) => item.email === email && item.active);

    if (demoUser) {
      const isValid =
        !body.password ||
        body.password === demoUser.demoPassword ||
        body.password === SHARED_DEMO_PASSWORD;
      if (!isValid) {
        fail(401, "Invalid password. Use your registered password, or click any sample role above for 1-click access.");
      }
    } else if (email) {
      // Auto-provision a workspace session for seamless exploration
      const organizationId = nextId(state);
      const userId = oid(Number.parseInt(organizationId, 16) + 1);
      const namePart = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const organization = {
        _id: organizationId,
        id: organizationId,
        name: `${namePart} Logistics`,
        createdBy: userId,
        createdAt: date()
      };
      demoUser = {
        _id: userId,
        id: userId,
        fullName: namePart || "Workspace Member",
        email,
        demoPassword: body.password || SHARED_DEMO_PASSWORD,
        role: "supplier",
        active: true,
        organization: { id: organizationId, _id: organizationId, name: organization.name },
        createdAt: date()
      };
      state.organizations.push(organization);
      state.users.push(demoUser);
    } else {
      fail(400, "Please enter your work email.");
    }

    window.localStorage.setItem(SESSION_KEY, demoUser.id);
    return { user: demoUser };
  }
  if (path === "/auth/logout") {
    window.localStorage.removeItem(SESSION_KEY);
    return {};
  }
  if (path === "/auth/register") {
    const email = body.email?.trim().toLowerCase();
    const allowedRoles = ["manufacturer", "supplier", "warehouse_manager", "logistics_provider"];
    if (!body.fullName?.trim() || !email || !body.organizationName?.trim() || !allowedRoles.includes(body.role)) {
      fail(400, "Enter your name, email, organization and a supported role.");
    }
    if (typeof body.password !== "string" || body.password.length < 6 || body.password.length > 72) {
      fail(400, "Choose a password between 6 and 72 characters.");
    }

    const existingIndex = state.users.findIndex((item) => item.email === email);
    let newUser;
    if (existingIndex >= 0) {
      newUser = state.users[existingIndex];
      newUser.fullName = body.fullName.trim();
      newUser.demoPassword = body.password;
      newUser.role = body.role;
      let organization = state.organizations.find((o) => o.id === newUser.organization.id);
      if (organization) {
        organization.name = body.organizationName.trim();
      }
      newUser.organization.name = body.organizationName.trim();
    } else {
      const organizationId = nextId(state);
      const userId = oid(Number.parseInt(organizationId, 16) + 1);
      const organization = {
        _id: organizationId,
        id: organizationId,
        name: body.organizationName.trim(),
        createdBy: userId,
        createdAt: date()
      };
      newUser = {
        _id: userId,
        id: userId,
        fullName: body.fullName.trim(),
        email,
        demoPassword: body.password,
        role: body.role,
        active: true,
        organization: { id: organizationId, _id: organizationId, name: organization.name },
        createdAt: date()
      };
      state.organizations.push(organization);
      state.users.push(newUser);
    }

    window.localStorage.setItem(SESSION_KEY, newUser.id);
    return { user: newUser };
  }
  if (path === "/optimization/route") {
    return optimizeDemoRoute(body);
  }
  if (path === "/organization/invitations") {
    const invitation = { _id: nextId(state), organization: user.organization.id, organizationName: user.organization.name, email: body.email.trim().toLowerCase(), role: body.role, status: "pending", expiresAt: new Date(now + 7 * 86_400_000).toISOString(), invitationUrl: `${window.location.origin}/invite/demo-${Date.now()}` };
    state.invitations.unshift(invitation);
    return { invitation };
  }
  if (path === "/suppliers") {
    const supplier = { _id: nextId(state), organization: user.organization.id, name: body.name.trim(), contactName: body.contactName ?? "", email: body.email ?? "", phone: body.phone ?? "", address: body.address ?? "", participantOrganization: body.participantOrganization, active: true, createdAt: date() };
    state.suppliers.unshift(supplier);
    return { supplier };
  }
  if (path === "/products") {
    const product = { _id: nextId(state), organization: user.organization.id, ...body, reorderPoint: Number(body.reorderPoint ?? 0), active: true, createdAt: date() };
    state.products.unshift(product);
    return { product };
  }
  if (path === "/warehouses") {
    const warehouse = { _id: nextId(state), organization: user.organization.id, ...body, createdAt: date() };
    state.warehouses.unshift(warehouse);
    return { warehouse };
  }
  if (path === "/inventory/movements") {
    const product = state.products.find((item) => item._id === body.product && item.organization === user.organization.id);
    const warehouse = state.warehouses.find((item) => item._id === body.warehouse && item.organization === user.organization.id);
    const quantity = Number(body.quantity);
    if (!product || !warehouse || !Number.isFinite(quantity) || quantity <= 0) fail(400, "Choose a sample product, warehouse and positive quantity.");
    let stock = state.inventory.find((item) => item.product === product._id && item.warehouse === warehouse._id);
    if (!stock) {
      stock = { _id: nextId(state), organization: user.organization.id, product: product._id, warehouse: warehouse._id, quantity: 0, updatedBy: user.id };
      state.inventory.push(stock);
    }
    if (body.direction === "out" && stock.quantity < quantity) fail(409, "The sample stock balance cannot become negative.");
    stock.quantity += body.direction === "out" ? -quantity : quantity;
    stock.updatedBy = user.id;
    stock.updatedAt = date();
    const movement = { _id: nextId(state), organization: user.organization.id, product: product._id, warehouse: warehouse._id, direction: body.direction, quantity, reason: body.reason ?? "", performedBy: user.id, createdAt: date() };
    state.movements.unshift(movement);
    return { inventory: stock, movement };
  }
  if (path === "/purchase-orders") {
    const supplier = state.suppliers.find((item) => item._id === body.supplier && item.organization === user.organization.id);
    if (!supplier?.participantOrganization) fail(400, "Choose a sample supplier with a participating demo organization.");
    const items = (body.items ?? []).map((item) => {
      const product = state.products.find((entry) => entry._id === item.product && entry.organization === user.organization.id);
      if (!product) fail(400, "Choose a product from the sample catalogue.");
      return { product: product._id, sku: product.sku, name: product.name, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) };
    });
    const purchaseOrder = { _id: nextId(state), buyerOrganization: user.organization.id, supplierOrganization: supplier.participantOrganization, supplier, createdBy: user.id, status: "draft", notes: body.notes ?? "", items, transitions: [], createdAt: date(), updatedAt: date() };
    state.purchaseOrders.unshift(purchaseOrder);
    return { purchaseOrder };
  }
  if (path === "/shipments") {
    const order = state.purchaseOrders.find((item) => item._id === body.purchaseOrder && item.buyerOrganization === user.organization.id);
    if (!order || order.status !== "confirmed") fail(409, "Choose a confirmed sample purchase order before creating a shipment.");
    const shipment = { _id: nextId(state), buyerOrganization: user.organization.id, supplierOrganization: order.supplierOrganization, providerOrganization: body.providerOrganization, purchaseOrder: order._id, assignedBy: user.id, trackingNumber: body.trackingNumber || `DEMO-SHIP-${Date.now().toString().slice(-6)}`, origin: body.origin, destination: body.destination, expectedDelivery: body.expectedDelivery ?? null, estimatedCost: Number(body.estimatedCost ?? 0), status: "pending", actualDelivery: null, createdAt: date(), timeline: [{ status: "pending", message: "DEMO: Sample shipment created.", by: user.id, at: date() }] };
    state.shipments.unshift(shipment);
    return { shipment };
  }
  if (/^\/shipments\/[^/]+\/events$/.test(path)) {
    const id = path.split("/")[2];
    const shipment = state.shipments.find((item) => item._id === id && visibleShipments(state, user).some((visible) => visible._id === id));
    if (!shipment) fail(404, "Sample shipment not found.");
    shipment.timeline.push({ status: shipment.status, message: `DEMO: ${body.message}`, by: user.id, at: date() });
    return { shipment };
  }
  fail(404, `No browser demo action is configured for ${path}.`);
}

function patchData(state, path, body, user) {
  if (path === "/organization") {
    if (!["admin", "manufacturer"].includes(user.role)) fail(403, "Only demo managers can rename this organization.");
    const organization = state.organizations.find((item) => item._id === user.organization.id);
    organization.name = body.name.trim();
    for (const item of state.users.filter((entry) => entry.organization.id === organization._id)) item.organization.name = organization.name;
    user.organization.name = organization.name;
    return { organization: { id: organization._id, name: organization.name, createdAt: organization.createdAt } };
  }
  const memberMatch = path.match(/^\/organization\/members\/([^/]+)$/);
  if (memberMatch) {
    const member = state.users.find((item) => item.id === memberMatch[1] && item.organization.id === user.organization.id);
    if (!member || member.id === user.id) fail(404, "Sample team member not found.");
    Object.assign(member, body);
    return { member };
  }
  const orderMatch = path.match(/^\/purchase-orders\/([^/]+)\/status$/);
  if (orderMatch) {
    const order = state.purchaseOrders.find((item) => item._id === orderMatch[1] && visibleOrders(state, user).some((visible) => visible._id === item._id));
    if (!order) fail(404, "Sample purchase order not found.");
    const permitted = {
      manufacturer: { draft: ["submitted"], submitted: ["approved", "rejected"] },
      supplier: { approved: ["confirmed"] },
      admin: { draft: ["submitted"], submitted: ["approved", "rejected"], approved: ["confirmed"] }
    };
    if (!permitted[user.role]?.[order.status]?.includes(body.status)) fail(409, `This demo role cannot move a ${order.status} order to ${body.status}.`);
    const previous = order.status;
    order.status = body.status;
    order.updatedAt = date();
    order.transitions.push({ from: previous, to: body.status, by: user.id, note: "Browser-only sample workflow", at: date() });
    return { purchaseOrder: order };
  }
  const shipmentStatusMatch = path.match(/^\/shipments\/([^/]+)\/status$/);
  if (shipmentStatusMatch) {
    const shipment = state.shipments.find((item) => item._id === shipmentStatusMatch[1] && visibleShipments(state, user).some((visible) => visible._id === item._id));
    if (!shipment) fail(404, "Sample shipment not found.");
    const permitted = {
      supplier: { pending: ["ready"] },
      logistics_provider: { ready: ["in_transit"], in_transit: ["delayed", "delivered"], delayed: ["in_transit", "delivered"] },
      manufacturer: { pending: ["cancelled"] },
      admin: { pending: ["ready", "cancelled"], ready: ["in_transit", "cancelled"], in_transit: ["delayed", "delivered"], delayed: ["in_transit", "delivered"] }
    };
    if (!permitted[user.role]?.[shipment.status]?.includes(body.status)) fail(409, `This demo role cannot move a ${shipment.status} shipment to ${body.status}.`);
    shipment.status = body.status;
    if (body.status === "delivered") shipment.actualDelivery = date();
    shipment.timeline.push({ status: body.status, message: `DEMO: Status updated to ${body.status.replaceAll("_", " ")}.`, by: user.id, at: date() });
    return { shipment };
  }
  fail(404, `No browser demo update is configured for ${path}.`);
}

function deleteData(state, path, user) {
  const invitationMatch = path.match(/^\/organization\/invitations\/([^/]+)$/);
  if (invitationMatch) {
    const index = state.invitations.findIndex((item) => item._id === invitationMatch[1] && item.organization === user.organization.id);
    if (index < 0) fail(404, "Sample invitation not found.");
    state.invitations.splice(index, 1);
    return {};
  }
  fail(404, `No browser demo delete is configured for ${path}.`);
}

async function request(method, url, body) {
  const normalized = url.startsWith("/api") ? url.slice(4) || "/" : url;
  const parsed = new URL(normalized, window.location.origin);
  const path = decodeURIComponent(parsed.pathname);
  const params = parsed.searchParams;
  const state = readState();
  const user = path === "/auth/login" || path === "/auth/register" || path === "/auth/logout" ? currentUser(state) : requireUser(state);

  let data;
  if (method === "get") data = getData(state, path, params, user);
  else if (method === "post") data = postData(state, path, body ?? {}, user);
  else if (method === "patch") data = patchData(state, path, body ?? {}, user);
  else if (method === "delete") data = deleteData(state, path, user);
  else fail(405, "This browser demo action is not supported.");

  writeState(state);
  return ok(data, "This illustrative browser-only demo was updated. No server or database was contacted.");
}

export const demoApi = {
  get: (url) => request("get", url),
  post: (url, body) => request("post", url, body),
  patch: (url, body) => request("patch", url, body),
  delete: (url) => request("delete", url)
};

export function resetDemoData() {
  window.localStorage.removeItem(DATA_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}
