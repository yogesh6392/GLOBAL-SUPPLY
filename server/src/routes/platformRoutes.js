import { Router } from "express";
import {
  executeAlgorithm,
  getDemoRouteNetwork,
  getAdminUsers,
  getAlgorithmCatalog,
  getAnalyticsOverview,
  getOrganization,
  listPartnerOrganizations,
  optimizeRoute,
  updateOrganization
} from "../controllers/platformController.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  createInvitation,
  listInvitations,
  listMembers,
  revokeInvitation,
  updateMember
} from "../controllers/teamController.js";

const router = Router();
router.use(authenticate);
router.get("/organization", getOrganization);
router.patch("/organization", updateOrganization);
router.get("/organization/members", listMembers);
router.patch("/organization/members/:id", updateMember);
router.get("/organization/invitations", listInvitations);
router.post("/organization/invitations", createInvitation);
router.delete("/organization/invitations/:id", revokeInvitation);
router.get("/partners/:role", listPartnerOrganizations);
router.get("/admin/users", getAdminUsers);
router.get("/analytics/overview", getAnalyticsOverview);
router.get("/algorithms", getAlgorithmCatalog);
router.post("/algorithms/run", executeAlgorithm);
router.get("/optimization/network", getDemoRouteNetwork);
router.post("/optimization/route", optimizeRoute);

export default router;
