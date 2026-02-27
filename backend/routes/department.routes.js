import express from "express";
import { createDepartment, getDepartments, updateDepartment, deleteDepartment } from "../controllers/department.controller.js";
import { protect } from "../Middleware/authMiddleware.js";
import { requireRole } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, requireRole("admin"), createDepartment);
router.get("/", protect, getDepartments);
router.put("/:id", protect, requireRole("admin"), updateDepartment);
router.delete("/:id", protect, requireRole("admin"), deleteDepartment);

export default router;
