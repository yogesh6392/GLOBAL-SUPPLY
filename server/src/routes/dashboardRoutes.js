import { Router } from "express";
import { getDashboard, simulateOperationalEvent } from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/", authenticate, getDashboard);
router.post("/simulate", authenticate, simulateOperationalEvent);

export default router;
