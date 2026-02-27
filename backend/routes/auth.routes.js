import express from "express";
import { register, login, getProfile, logout, getUsers } from "../controllers/auth.controller.js";
import { protect } from "../Middleware/authMiddleware.js";
import { requireRole } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, getProfile); // renamed from /me (clearer)
router.post("/logout", logout);              // ✅ LOGOUT
router.get("/users", protect, requireRole("admin"), getUsers); // Admin: list all users

export default router;
