/**
 * Historical Energy Data Seeder — 30 Days
 * Creates 30 days of realistic past energy readings for all classrooms
 * Generates readings every 15 minutes (to keep DB size manageable)
 *
 * Usage: node simulator/seedHistory.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

import Classroom from "../Models/Classroom.js";
import EnergyData from "../Models/EnergyData.js";
import Alert from "../Models/Alert.js";
import CampusSettings from "../Models/CampusSettings.js";
import { getBaseLoad, addNoise, getVoltage, getCurrent } from "./patterns.js";

const DAYS_BACK = 30;                    // 30 days of history
const INTERVAL_MIN = 15;                 // one reading every 15 minutes
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000;
const INTERVAL_SEC = INTERVAL_MIN * 60;
const TOTAL_READINGS_PER_ROOM = (DAYS_BACK * 24 * 60) / INTERVAL_MIN; // 2880

async function seedHistory() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const classrooms = await Classroom.find().lean();
    const campus = await CampusSettings.findOne().lean();

    if (classrooms.length === 0) {
        console.log("⚠️  No classrooms found. Add classrooms via Admin page first.");
        process.exit(1);
    }

    const tariff = campus?.electricityTariff || 8;
    const co2Factor = campus?.co2Factor || 0.82;

    console.log(`═══════════════════════════════════════════`);
    console.log(`  📅 Seeding ${DAYS_BACK} days of historical data`);
    console.log(`  🏫 ${classrooms.length} classrooms`);
    console.log(`  📊 ~${TOTAL_READINGS_PER_ROOM} readings per classroom`);
    console.log(`  📦 ~${classrooms.length * TOTAL_READINGS_PER_ROOM} total documents`);
    console.log(`═══════════════════════════════════════════\n`);

    const now = new Date();
    const entries = [];
    const alerts = [];

    for (const classroom of classrooms) {
        let readCount = 0;
        let anomalyCount = 0;
        let idleCount = 0;

        for (let i = TOTAL_READINGS_PER_ROOM; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - i * INTERVAL_MS);
            const hour = timestamp.getHours();
            const dayOfWeek = timestamp.getDay(); // 0=Sunday

            // ── Base Load ──
            let power = getBaseLoad(classroom, hour, dayOfWeek);
            power = addNoise(power, 0.12);

            // ── Anomaly Detection ──
            let isAnomaly = false;
            let anomalyScore = 0;

            // 4% chance during class hours (weekdays 9-17)
            const isClassHour = dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 17;
            if (isClassHour && Math.random() < 0.04) {
                power = Math.round(power * (2 + Math.random() * 2)); // 2x-4x spike
                isAnomaly = true;
                anomalyScore = 1.5 + Math.random() * 3.5; // score from 1.5 to 5
                anomalyCount++;
            } else {
                anomalyScore = Math.random() * 0.8; // normal low score
            }

            // ── Electrical values ──
            const voltage = getVoltage();
            const current = getCurrent(power, voltage);
            const energy = Math.round((power * INTERVAL_SEC) / 3600000 * 100000) / 100000;
            const cost = Math.round(energy * tariff * 100) / 100;
            const co2 = Math.round(energy * co2Factor * 1000) / 1000;

            // ── Occupancy ──
            let occupancy = 0;
            if (isClassHour) {
                occupancy = 5 + Math.floor(Math.random() * (classroom.capacity || 40));
            }

            // ── Idle Detection ──
            // Power > 50W when nobody is there during class hours = idle waste
            const isIdle = occupancy === 0 && power > 50 && isClassHour;
            if (isIdle) idleCount++;

            // ── Scheduled class simulation (weekdays 8AM-5PM) ──
            const scheduledClass = dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 8 && hour < 17;

            entries.push({
                classroomId: classroom._id,
                timestamp,
                voltage: Math.round(voltage * 10) / 10,
                current,
                power,
                energy,
                cost,
                co2,
                isAnomaly,
                isIdle,
                anomalyScore: Math.round(anomalyScore * 100) / 100,
                metadata: {
                    occupancy,
                    scheduledClass
                }
            });

            // ── Generate alerts for anomalies/idle ──
            if (isAnomaly) {
                alerts.push({
                    type: "ANOMALY",
                    severity: power > 5000 ? "CRITICAL" : "HIGH",
                    message: `Abnormal power spike: ${power}W in ${classroom.classroomId}`,
                    classroomId: classroom._id,
                    acknowledged: Math.random() < 0.5,  // some acknowledged
                    createdAt: timestamp
                });
            }

            if (isIdle && Math.random() < 0.3) { // only 30% of idle events become alerts
                alerts.push({
                    type: "IDLE",
                    severity: "MEDIUM",
                    message: `Idle waste: ${power}W when unoccupied in ${classroom.classroomId}`,
                    classroomId: classroom._id,
                    acknowledged: Math.random() < 0.3,
                    createdAt: timestamp
                });
            }

            readCount++;
        }

        console.log(`  📊 ${classroom.classroomId} (${classroom.name}): ${readCount} readings | ${anomalyCount} anomalies | ${idleCount} idle`);
    }

    // ── Clear old data and insert new ──
    console.log(`\n🗑️  Clearing existing energy data and alerts...`);
    await EnergyData.deleteMany({});
    await Alert.deleteMany({});

    // Insert in batches of 5000 to avoid memory issues
    console.log(`📥 Inserting ${entries.length} energy readings...`);
    const BATCH_SIZE = 5000;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        await EnergyData.insertMany(batch, { ordered: false });
        const pct = Math.min(100, Math.round(((i + batch.length) / entries.length) * 100));
        process.stdout.write(`  Progress: ${pct}%\r`);
    }
    console.log(`  ✅ Energy data inserted!`);

    console.log(`🔔 Inserting ${alerts.length} alerts...`);
    if (alerts.length > 0) {
        for (let i = 0; i < alerts.length; i += BATCH_SIZE) {
            await Alert.insertMany(alerts.slice(i, i + BATCH_SIZE), { ordered: false });
        }
    }

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  ✅ Historical data seeded successfully!`);
    console.log(`  📊 ${entries.length} energy readings`);
    console.log(`  🔔 ${alerts.length} alerts`);
    console.log(`  📅 ${DAYS_BACK} days of data`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`\n💡 Restart the backend server and refresh the browser.`);

    await mongoose.disconnect();
}

seedHistory().catch(err => { console.error(err); process.exit(1); });
