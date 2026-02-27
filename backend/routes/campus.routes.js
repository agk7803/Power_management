import express from "express";
import { createCampus, getCampus, updateCampus } from "../controllers/campus.controller.js";
import { protect } from "../Middleware/authMiddleware.js";
import { requireRole } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, requireRole("admin"), createCampus);
router.get("/", protect, getCampus);
router.put("/", protect, requireRole("admin"), updateCampus);

export default router;
