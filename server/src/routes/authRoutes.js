import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  getCurrentUser,
  login,
  logout,
  register
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateLogin, validateRegistration } from "../validators/auth.js";
import { acceptInvitation, getInvitationDetails } from "../controllers/teamController.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later."
  }
});

router.post("/register", authLimiter, validateRegistration, register);
router.post("/login", authLimiter, validateLogin, login);
router.get("/invitations/:token", getInvitationDetails);
router.post("/invitations/:token/accept", authLimiter, acceptInvitation);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getCurrentUser);

export default router;
