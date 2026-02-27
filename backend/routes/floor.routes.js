import express from "express";
import { createFloor, getFloors, getFloorsByDepartment, deleteFloor } from "../controllers/floor.controller.js";
import { protect } from "../Middleware/authMiddleware.js";
import { requireRole } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, requireRole("admin"), createFloor);
router.get("/", protect, getFloors);
router.get("/department/:departmentId", protect, getFloorsByDepartment);
router.delete("/:id", protect, requireRole("admin"), deleteFloor);

export default router;
