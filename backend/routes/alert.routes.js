import express from "express";
import { getAlerts, acknowledgeAlert } from "../controllers/alert.controller.js";
import { protect } from "../Middleware/authMiddleware.js";
import { requireRole } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, getAlerts);
router.put("/:id/acknowledge", protect, requireRole("admin"), acknowledgeAlert);

export default router;
