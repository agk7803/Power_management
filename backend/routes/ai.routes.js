import express from "express";
import * as aiController from "../controllers/ai.controller.js";
import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

/**
 * AI Insights Routes
 * Prefix: /api/ai
 */

// Statistical Anomaly Detection for a classroom
router.get("/anomaly/:classroomId", protect, aiController.getAnomalyAnalysis);

export default router;
