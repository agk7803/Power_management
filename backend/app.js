
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import campusRoutes from "./routes/campus.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import floorRoutes from "./routes/floor.routes.js";
import classroomRoutes from "./routes/classroom.routes.js";
import deviceRoutes from "./routes/device.routes.js";
import energyRoutes from "./routes/energy.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import automationRoutes from "./routes/automation.routes.js";

const app = express();

/* =======================
   CORS CONFIG (FIRST)
======================= */

const allowedOrigins = [
  "http://localhost:5001",
  "http://localhost:3000"

];

const corsOptions = {
  origin: function (origin, callback) {
    console.log("🌍 CORS ORIGIN:", origin);

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow any device on local network
    if (origin.match(/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/)) {
      return callback(null, true);
    }

    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

/* =======================
   MIDDLEWARES
======================= */

app.use(express.json());
app.use(cookieParser());

/* =======================
   ROUTES
======================= */

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/campus", campusRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/floors", floorRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/energy", energyRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/automation", automationRoutes);

export default app;

