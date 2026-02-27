import express from "express";
import { getAutomationStatus, getAutomationLogs, manualTurnOff } from "../controllers/automation.controller.js";
import { protect } from "../Middleware/authMiddleware.js";
import { requireRole } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.get("/status", protect, getAutomationStatus);
router.get("/logs", protect, getAutomationLogs);
router.post("/turnoff/:classroomId", protect, requireRole("admin"), manualTurnOff);

export default router;
