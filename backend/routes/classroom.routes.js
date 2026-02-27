import express from "express";
import { createClassroom, getClassrooms, updateClassroom, deleteClassroom } from "../controllers/classroom.controller.js";
import { protect } from "../Middleware/authMiddleware.js";
import { requireRole } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, requireRole("admin"), createClassroom);
router.get("/", protect, getClassrooms);
router.put("/:id", protect, requireRole("admin"), updateClassroom);
router.delete("/:id", protect, requireRole("admin"), deleteClassroom);

export default router;
