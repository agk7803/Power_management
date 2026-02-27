/**
 * ESP32 Dummy Hardware Simulator (Classroom-Based)
 *
 * Simulates a single ESP32 sending energy readings for multiple classrooms:
 * 1. Connects to MongoDB to fetch registered classrooms
 * 2. Sends realistic energy readings every 5 seconds using classroomId
 * 3. Simulates class-hour patterns, idle states, and anomaly spikes
 *
 * Usage: node simulator/simulator.js
 * Requires: Backend server running on PORT (default 5000)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

import Classroom from "../Models/Classroom.js";
import { getBaseLoad, addNoise, shouldSpike, getSpikeMultiplier, getVoltage, getCurrent } from "./patterns.js";

const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;
const SEND_INTERVAL = 5000; // 5 seconds
const DEMO_MODE = true;     // Always simulate peak class-hour loads (for live demos)

/* ──────────────────────────────────────
   HTTP Helper (native fetch)
────────────────────────────────────── */

async function postJSON(url, data) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const json = await response.json();
        return { ok: response.ok, status: response.status, data: json };
    } catch (error) {
        return { ok: false, status: 0, data: { message: error.message } };
    }
}

/* ──────────────────────────────────────
   Build a single reading (matches ESP32 format)
────────────────────────────────────── */

function buildReading(classroom) {
    const now = new Date();
    let hour = now.getHours();
    let dayOfWeek = now.getDay();

    // In demo mode, always simulate peak class hours
    if (DEMO_MODE) {
        hour = 10 + Math.floor(Math.random() * 5);  // 10 AM - 2 PM
        dayOfWeek = 1 + Math.floor(Math.random() * 5);   // Mon-Fri
    }

    // Calculate base load from classroom config
    let power = getBaseLoad(classroom, hour, dayOfWeek);

    // Add random noise (±10%)
    power = addNoise(power, 0.1);

    // Random anomaly spike (5% chance)
    if (shouldSpike(0.05)) {
        power = Math.round(power * getSpikeMultiplier());
        console.log(`⚡ ANOMALY SPIKE on ${classroom.classroomId}: ${power}W`);
    }

    // Calculate electrical values
    const voltage = getVoltage();
    const current = getCurrent(power, voltage);

    // Energy in kWh for this 5-second interval
    const energy = Math.round((power * 5) / 3600000 * 100000) / 100000;

    // Simulate occupancy based on time
    let occupied = 0;
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {   // Weekday
        if (hour >= 9 && hour < 17) {
            occupied = 1;
        }
    }

    return {
        classid: classroom.classroomId,   // e.g. "A33"
        occupied,
        voltage: Math.round(voltage * 10) / 10,
        current,
        power,
        energy
    };
}

/* ──────────────────────────────────────
   Send batch of readings (matches ESP32 format)
────────────────────────────────────── */

async function sendBatch(classrooms) {
    // Build ESP32-style batch payload
    const classes = classrooms.map(cr => buildReading(cr));

    const result = await postJSON(`${API_BASE}/energy/ingest`, { classes });

    if (result.ok) {
        for (const r of result.data.results || []) {
            const anomalyFlag = r.isAnomaly ? " 🚨 ANOMALY" : "";
            const idleFlag = r.isIdle ? " 💤 IDLE" : "";
            console.log(
                `📊 ${r.classid} | ${r.power}W | ${r.energy.toFixed(5)} kWh | ₹${r.cost} | ${r.co2} kg CO₂${anomalyFlag}${idleFlag}`
            );
        }
        if (result.data.errors) {
            for (const e of result.data.errors) {
                console.error(`❌ ${e.classid}: ${e.error}`);
            }
        }
    } else {
        console.error(`❌ Batch ingest failed: ${result.data.message}`);
    }
}

/* ──────────────────────────────────────
   Main Loop
────────────────────────────────────── */

async function main() {
    console.log("═══════════════════════════════════════════");
    console.log("  🏫 Campus Power Management — ESP32 Simulator");
    console.log("  (Classroom-Based Mode — Single ESP32)");
    console.log("═══════════════════════════════════════════");
    console.log(`  API: ${API_BASE}`);
    console.log(`  Interval: ${SEND_INTERVAL / 1000}s`);
    console.log("");

    // Connect to MongoDB
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }

    // Track known classrooms to detect newly added ones
    let knownClassroomIds = new Set();

    // Start sending data — re-fetches classrooms every tick so new ones are picked up
    console.log("📈 Starting energy data transmission...");
    console.log("   (New classrooms added via Admin will be auto-detected)\n");
    console.log("─".repeat(80));

    let iteration = 0;

    const interval = setInterval(async () => {
        iteration++;

        // Re-fetch classrooms every tick to pick up newly added ones
        const classrooms = await Classroom.find().lean();

        if (classrooms.length === 0) {
            if (iteration === 1) {
                console.log("⚠️  No classrooms found. Add classrooms via Admin page.");
            }
            return;
        }

        // Log newly detected classrooms
        for (const cr of classrooms) {
            if (!knownClassroomIds.has(cr.classroomId)) {
                console.log(`🆕 New classroom detected: ${cr.classroomId} (${cr.name})`);
                knownClassroomIds.add(cr.classroomId);
            }
        }

        await sendBatch(classrooms);

        console.log("─".repeat(80));
    }, SEND_INTERVAL);

    // Graceful shutdown
    process.on("SIGINT", async () => {
        console.log("\n\n🛑 Simulator shutting down...");
        clearInterval(interval);
        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB");
        process.exit(0);
    });
}

main().catch(console.error);
