import express from "express";
import { registerDevice, getDevices, updateDevice, activateDevice, heartbeat } from "../controllers/device.controller.js";
import { protect } from "../Middleware/authMiddleware.js";
import { requireRole } from "../Middleware/roleMiddleware.js";

const router = express.Router();

// Admin routes (require auth + admin role)
router.post("/register", protect, requireRole("admin"), registerDevice);
router.get("/", protect, getDevices);
router.put("/:id", protect, requireRole("admin"), updateDevice);

// Device/Simulator routes (no auth — devices use deviceId for identification)
router.post("/activate", activateDevice);
router.post("/heartbeat", heartbeat);

export default router;
