import express from "express";
import * as aiController from "../controllers/ai.controller.js";
import { getForecast, getEfficiency } from "../controllers/forecast.controller.js";
import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

/**
 * AI Insights Routes
 * Prefix: /api/ai
 */

// Statistical Anomaly Detection for a classroom
router.get("/anomaly/:classroomId", protect, aiController.getAnomalyAnalysis);

// OpenRouter AI (Llama 3) — Detailed anomaly explanation & energy optimization
router.post("/explain", protect, aiController.explainAnomaliesHandler);

// Load Forecasting (24h actual vs predicted, tomorrow forecast, model stats)
router.get("/forecast", protect, getForecast);

// Efficiency & Power Quality Analysis (power factor, apparent power, daily peak)
router.get("/efficiency", protect, getEfficiency);

export default router;
