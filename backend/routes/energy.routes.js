import express from "express";
import { ingestEnergy, getLatestReadings, getEnergyHistory } from "../controllers/energy.controller.js";
import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

// Simulator/Device sends data here (no auth — devices use deviceId)
router.post("/ingest", ingestEnergy);

// Dashboard queries (require auth)
router.get("/latest", protect, getLatestReadings);
router.get("/history/:classroomId", protect, getEnergyHistory);

export default router;
