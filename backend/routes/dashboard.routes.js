import express from "express";
import { getDashboardData, getHourlyTrend } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/", getDashboardData);
router.get("/hourly", getHourlyTrend);

export default router;
