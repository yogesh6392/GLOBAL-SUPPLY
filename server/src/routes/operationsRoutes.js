import { Router } from "express";
import {
  addShipmentEvent,
  createProduct,
  createPurchaseOrder,
  createShipment,
  createSupplier,
  createWarehouse,
  getReorderSuggestions,
  listInventory,
  listInventoryMovements,
  listNotifications,
  listProducts,
  listPurchaseOrders,
  listShipments,
  listSuppliers,
  listWarehouses,
  moveInventory,
  transitionPurchaseOrder,
  updateShipmentStatus
} from "../controllers/operationsController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
router.use(authenticate);

router.get("/suppliers", listSuppliers);
router.post("/suppliers", createSupplier);
router.get("/products", listProducts);
router.post("/products", createProduct);
router.get("/purchase-orders", listPurchaseOrders);
router.post("/purchase-orders", createPurchaseOrder);
router.patch("/purchase-orders/:id/status", transitionPurchaseOrder);
router.get("/warehouses", listWarehouses);
router.post("/warehouses", createWarehouse);
router.get("/inventory", listInventory);
router.get("/inventory/movements", listInventoryMovements);
router.post("/inventory/movements", moveInventory);
router.get("/inventory/reorder-suggestions", getReorderSuggestions);
router.get("/inventory/notifications", listNotifications);
router.get("/shipments", listShipments);
router.post("/shipments", createShipment);
router.post("/shipments/:id/events", addShipmentEvent);
router.patch("/shipments/:id/status", updateShipmentStatus);

export default router;
