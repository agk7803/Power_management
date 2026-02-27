import express from "express";
import { createTimetableEntry, getTimetable, getTimetableByClassroom, updateTimetableEntry, deleteTimetableEntry } from "../controllers/timetable.controller.js";
import { protect } from "../Middleware/authMiddleware.js";
import { requireRole } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, requireRole("admin"), createTimetableEntry);
router.get("/", protect, getTimetable);
router.get("/:classroomId", protect, getTimetableByClassroom);
router.put("/:id", protect, requireRole("admin"), updateTimetableEntry);
router.delete("/:id", protect, requireRole("admin"), deleteTimetableEntry);

export default router;
