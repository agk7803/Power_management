import express from "express";
import { getTrends, getPeakAnalysis, getAnomalyAnalytics, getIdleAnalytics, getComparison } from "../controllers/analytics.controller.js";
import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get("/trends", protect, getTrends);
router.get("/peak", protect, getPeakAnalysis);
router.get("/anomalies", protect, getAnomalyAnalytics);
router.get("/idle", protect, getIdleAnalytics);
router.get("/compare", protect, getComparison);

export default router;
