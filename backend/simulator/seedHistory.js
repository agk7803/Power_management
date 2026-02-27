/**
 * Historical Energy Data Seeder — 30 Days (Realistic Campus Edition)
 *
 * Generates 30 days of realistic past energy readings for all classrooms
 * with patterns that closely match a real college campus:
 *   - Daily load curves (ramp-up, peak, lunch dip, ramp-down)
 *   - Day-of-week variation (lighter Mon/Fri, heavier mid-week)
 *   - Weather/seasonal AC load drift across the 30-day window
 *   - Minor anomalies (~4%) with spike bursts, voltage sags, stuck readings
 *   - Idle waste detection when power > 50W in unoccupied rooms
 *   - Proper ANOMALY and IDLE alerts with realistic severity
 *
 * Readings are generated every 15 minutes → ~2,880 per classroom
 *
 * Usage:  node simulator/seedHistory.js
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

/* ══════════════════════════════════════════════
   Configuration
   ══════════════════════════════════════════════ */

const DAYS_BACK = 30;                              // 30 days of history
const INTERVAL_MIN = 15;                           // one reading every 15 minutes
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000;
const INTERVAL_SEC = INTERVAL_MIN * 60;
const TOTAL_READINGS_PER_ROOM = (DAYS_BACK * 24 * 60) / INTERVAL_MIN; // 2880

/* ══════════════════════════════════════════════
   Realistic Pattern Helpers
   ══════════════════════════════════════════════ */

/**
 * Day-of-week load multiplier
 * Mon=lighter start, Wed/Thu=peak mid-week, Fri=early exit trend
 */
function getDayMultiplier(dayOfWeek) {
    const multipliers = {
        0: 0.05,   // Sunday  — standby only
        1: 0.88,   // Monday  — slow start
        2: 1.00,   // Tuesday — full load
        3: 1.05,   // Wednesday — peak mid-week
        4: 1.02,   // Thursday — high
        5: 0.82,   // Friday — many leave early
        6: 0.05    // Saturday — standby only
    };
    return multipliers[dayOfWeek] || 1.0;
}

/**
 * Lunch-hour load dip (12:30 PM - 1:30 PM)
 * Returns a multiplier: 1.0 normally, ~0.55-0.65 during lunch
 */
function getLunchDip(hour, minute) {
    // 12:30 to 13:30 is lunch break
    const timeInMinutes = hour * 60 + minute;
    if (timeInMinutes >= 750 && timeInMinutes <= 810) {    // 12:30 - 13:30
        // Bell curve dip: deepest at 13:00
        const center = 780; // 13:00
        const dist = Math.abs(timeInMinutes - center) / 30;
        return 0.55 + 0.15 * dist; // 0.55 at center, ~0.70 at edges
    }
    return 1.0;
}

/**
 * Gradual ramp-up multiplier (7:00 - 9:00 AM)
 * Simulates lights→fans→ACs turning on progressively
 */
function getRampUp(hour, minute) {
    const timeInMinutes = hour * 60 + minute;
    if (timeInMinutes >= 420 && timeInMinutes < 540) { // 7:00 - 9:00
        return 0.3 + 0.7 * ((timeInMinutes - 420) / 120); // 0.3 → 1.0
    }
    return 1.0;
}

/**
 * Gradual ramp-down multiplier (17:00 - 21:00)
 * Simulates equipment being switched off progressively
 */
function getRampDown(hour, minute) {
    const timeInMinutes = hour * 60 + minute;
    if (timeInMinutes >= 1020 && timeInMinutes < 1260) { // 17:00 - 21:00
        return 1.0 - 0.85 * ((timeInMinutes - 1020) / 240); // 1.0 → 0.15
    }
    return 1.0;
}

/**
 * Weather/seasonal AC load modifier
 * Simulates temperature variation across the 30-day window:
 *   - Hotter around days 12-20 (mid-month), cooler at start/end
 *   - Adds ±15% to AC-related load
 * @param {number} dayIndex - 0=30 days ago, 29=today
 */
function getWeatherMultiplier(dayIndex) {
    // Sinusoidal pattern: peaks around day 16 of 30
    const phase = (dayIndex / DAYS_BACK) * Math.PI;
    return 1.0 + 0.15 * Math.sin(phase);  // 1.0 → 1.15 → 1.0
}

/**
 * Daily base drift — each day has a slight persistent offset
 * Simulates real-world variance (different schedules, lab usage, etc.)
 * @param {number} dayIndex - day number 0-29
 * @param {string} classroomId - for unique per-classroom variation
 */
function getDailyDrift(dayIndex, classroomId) {
    // Simple deterministic-ish variation using string hash
    let hash = 0;
    const key = `${classroomId}-${dayIndex}`;
    for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
    }
    // ±5% daily drift
    return 1.0 + ((hash % 100) / 1000);  // -0.099 to +0.099
}

/**
 * Realistic occupancy that follows class schedules
 */
function getOccupancy(hour, minute, dayOfWeek, classroom) {
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0;

    const timeInMinutes = hour * 60 + minute;

    // Lunch break — most students leave
    if (timeInMinutes >= 750 && timeInMinutes <= 810) {
        return Math.floor(Math.random() * 5); // 0-4 stragglers
    }

    // Class hours: 9 AM - 5 PM
    if (hour >= 9 && hour < 17) {
        const maxCapacity = classroom.capacity || 40;
        // Typical class fills 50-90% of capacity
        const fillRate = 0.5 + Math.random() * 0.4;
        return Math.floor(maxCapacity * fillRate);
    }

    // Early morning (7-9) — faculty/staff arriving
    if (hour >= 7 && hour < 9) {
        return Math.floor(Math.random() * 5);
    }

    // Evening (5-7 PM) — some students stay
    if (hour >= 17 && hour < 19) {
        return Math.floor(Math.random() * 10);
    }

    return 0;
}

/* ══════════════════════════════════════════════
   Anomaly Generator
   ══════════════════════════════════════════════ */

/**
 * Determine if this reading is anomalous and apply the spike
 * Anomaly types:
 *   - SURGE:     Sudden 2x-4x power spike (compressor kick, faulty breaker)
 *   - STUCK_HIGH: Constant high load (stuck relay, thermostat failure)
 *   - VOLTAGE_SAG: Correlated low voltage with high current draw
 */
function applyAnomaly(power, voltage, stuckState) {
    // If we're in a stuck-high burst, continue it
    if (stuckState.remaining > 0) {
        stuckState.remaining--;
        return {
            power: stuckState.stuckPower,
            voltage: voltage - 5 - Math.random() * 5, // slight voltage drop during stuck
            isAnomaly: true,
            anomalyType: "STUCK_HIGH",
            anomalyScore: stuckState.score
        };
    }

    // 4% chance of new anomaly during class hours
    if (Math.random() >= 0.04) {
        return { power, voltage, isAnomaly: false, anomalyType: null, anomalyScore: Math.random() * 0.8 };
    }

    // Pick anomaly type
    const typeRoll = Math.random();

    if (typeRoll < 0.55) {
        // SURGE — sudden spike (55% of anomalies)
        const multiplier = 2 + Math.random() * 2;  // 2x to 4x
        const spikedPower = Math.round(power * multiplier);
        return {
            power: spikedPower,
            voltage: voltage - (Math.random() * 8),  // voltage may dip during surge
            isAnomaly: true,
            anomalyType: "SURGE",
            anomalyScore: 1.5 + Math.random() * 3.5  // 1.5 to 5.0
        };
    }

    if (typeRoll < 0.80) {
        // STUCK_HIGH — persists for 2-3 readings (25% of anomalies)
        const stuckPower = Math.round(power * (1.8 + Math.random() * 1.5));
        const score = 2.0 + Math.random() * 2.0;
        stuckState.remaining = 1 + Math.floor(Math.random() * 2); // 1-2 more after this
        stuckState.stuckPower = stuckPower;
        stuckState.score = score;
        return {
            power: stuckPower,
            voltage: voltage - 3 - Math.random() * 4,
            isAnomaly: true,
            anomalyType: "STUCK_HIGH",
            anomalyScore: score
        };
    }

    // VOLTAGE_SAG — abnormal current draw (20% of anomalies)
    const saggedVoltage = 200 + Math.random() * 15; // 200-215V (normally 225-235)
    const boostedPower = Math.round(power * (1.3 + Math.random() * 0.7));
    return {
        power: boostedPower,
        voltage: Math.round(saggedVoltage * 10) / 10,
        isAnomaly: true,
        anomalyType: "VOLTAGE_SAG",
        anomalyScore: 1.5 + Math.random() * 2.0
    };
}

/* ══════════════════════════════════════════════
   Main Seeder
   ══════════════════════════════════════════════ */

async function seedHistory() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const classrooms = await Classroom.find().lean();
    const campus = await CampusSettings.findOne().lean();

    if (classrooms.length === 0) {
        console.log("⚠️  No classrooms found. Run 'node simulator/seed.js' first.");
        process.exit(1);
    }

    const tariff = campus?.electricityTariff || 8;
    const co2Factor = campus?.co2Factor || 0.82;

    console.log(`═══════════════════════════════════════════`);
    console.log(`  📅 Seeding ${DAYS_BACK} days of REALISTIC campus data`);
    console.log(`  🏫 ${classrooms.length} classrooms`);
    console.log(`  📊 ~${TOTAL_READINGS_PER_ROOM} readings per classroom`);
    console.log(`  📦 ~${classrooms.length * TOTAL_READINGS_PER_ROOM} total documents`);
    console.log(`  ⚡ Anomaly rate: ~4% of class-hour readings`);
    console.log(`  🌤️  Weather variation: ±15% AC load drift`);
    console.log(`  🍽️  Lunch dip: 12:30–1:30 PM`);
    console.log(`═══════════════════════════════════════════\n`);

    const now = new Date();
    const entries = [];
    const alerts = [];

    for (const classroom of classrooms) {
        let readCount = 0;
        let anomalyCount = 0;
        let idleCount = 0;
        let surgeCount = 0;
        let stuckCount = 0;
        let sagCount = 0;

        // Per-classroom stuck-high state tracker
        const stuckState = { remaining: 0, stuckPower: 0, score: 0 };

        for (let i = TOTAL_READINGS_PER_ROOM; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - i * INTERVAL_MS);
            const hour = timestamp.getHours();
            const minute = timestamp.getMinutes();
            const dayOfWeek = timestamp.getDay();

            // Day index: 0 = oldest, DAYS_BACK-1 = today
            const dayIndex = DAYS_BACK - Math.floor(i / (24 * 60 / INTERVAL_MIN));

            // ── Multi-layered power calculation ──

            // 1. Base load from classroom equipment (uses patterns.js)
            let power = getBaseLoad(classroom, hour, dayOfWeek);

            // 2. Apply ramp-up (morning) or ramp-down (evening) curve
            if (hour >= 7 && hour < 9) {
                power *= getRampUp(hour, minute);
            } else if (hour >= 17 && hour < 21) {
                power *= getRampDown(hour, minute);
            }

            // 3. Day-of-week multiplier (Mon lighter, Wed peak, etc.)
            power *= getDayMultiplier(dayOfWeek);

            // 4. Lunch dip
            power *= getLunchDip(hour, minute);

            // 5. Weather/seasonal AC variation
            const weatherMult = getWeatherMultiplier(Math.max(0, dayIndex));
            // Only apply weather to AC portion of load
            const acPortion = (classroom.acCount || 0) * 1500;
            if (acPortion > 0 && power > 100) {
                // Add weather effect proportional to AC share of total load
                const acShare = acPortion / (power || 1);
                power *= (1 + (weatherMult - 1) * Math.min(acShare, 0.6));
            }

            // 6. Daily drift (per-classroom, per-day)
            power *= getDailyDrift(dayIndex, classroom.classroomId);

            // 7. Random noise (±8%)
            power = addNoise(power, 0.08);

            // ── Anomaly injection ──
            let isAnomaly = false;
            let anomalyScore = 0;
            let voltage = getVoltage();

            const isClassHour = dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 17;
            const isLunch = hour === 12 && minute >= 30 || hour === 13 && minute < 30;

            if (isClassHour && !isLunch) {
                const anomalyResult = applyAnomaly(power, voltage, stuckState);
                power = anomalyResult.power;
                voltage = anomalyResult.voltage;
                isAnomaly = anomalyResult.isAnomaly;
                anomalyScore = anomalyResult.anomalyScore || (Math.random() * 0.8);

                if (isAnomaly) {
                    anomalyCount++;
                    if (anomalyResult.anomalyType === "SURGE") surgeCount++;
                    if (anomalyResult.anomalyType === "STUCK_HIGH") stuckCount++;
                    if (anomalyResult.anomalyType === "VOLTAGE_SAG") sagCount++;
                }
            } else {
                anomalyScore = Math.random() * 0.8;
            }

            // Ensure power is non-negative
            power = Math.max(0, Math.round(power));
            voltage = Math.round(voltage * 10) / 10;

            // ── Electrical calculations ──
            const current = getCurrent(power, voltage);
            const energy = Math.round((power * INTERVAL_SEC) / 3600000 * 100000) / 100000;
            const cost = Math.round(energy * tariff * 100) / 100;
            const co2 = Math.round(energy * co2Factor * 1000) / 1000;

            // ── Occupancy ──
            const occupancy = getOccupancy(hour, minute, dayOfWeek, classroom);

            // ── Idle detection ──
            const isIdle = occupancy === 0 && power > 50 && isClassHour;
            if (isIdle) idleCount++;

            // ── Scheduled class ──
            const scheduledClass = dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 8 && hour < 17;

            entries.push({
                classroomId: classroom._id,
                timestamp,
                voltage,
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

            // ── Alerts ──
            if (isAnomaly) {
                alerts.push({
                    type: "ANOMALY",
                    severity: power > 5000 ? "CRITICAL" : power > 3000 ? "HIGH" : "MEDIUM",
                    message: `Abnormal power spike: ${power}W in ${classroom.classroomId}`,
                    classroomId: classroom._id,
                    acknowledged: Math.random() < 0.5,
                    createdAt: timestamp
                });
            }

            if (isIdle && Math.random() < 0.3) {
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

        console.log(`  📊 ${classroom.classroomId} (${classroom.name}):`);
        console.log(`     ${readCount} readings | ${anomalyCount} anomalies (${surgeCount} surges, ${stuckCount} stuck, ${sagCount} sags) | ${idleCount} idle`);
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
    console.log(`  ✅ Energy data inserted!              `);

    console.log(`🔔 Inserting ${alerts.length} alerts...`);
    if (alerts.length > 0) {
        for (let i = 0; i < alerts.length; i += BATCH_SIZE) {
            await Alert.insertMany(alerts.slice(i, i + BATCH_SIZE), { ordered: false });
        }
    }

    // ── Summary ──
    const totalAnomalies = entries.filter(e => e.isAnomaly).length;
    const totalIdle = entries.filter(e => e.isIdle).length;
    const totalClassHourReadings = entries.filter(e => {
        const d = new Date(e.timestamp);
        const dow = d.getDay();
        const h = d.getHours();
        return dow >= 1 && dow <= 5 && h >= 9 && h < 17;
    }).length;
    const anomalyRate = totalClassHourReadings > 0
        ? ((totalAnomalies / totalClassHourReadings) * 100).toFixed(1)
        : "0.0";

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  ✅ Realistic campus data seeded!`);
    console.log(`  📊 ${entries.length} energy readings`);
    console.log(`  ⚡ ${totalAnomalies} anomalies (${anomalyRate}% of class hours)`);
    console.log(`  💤 ${totalIdle} idle-waste events`);
    console.log(`  🔔 ${alerts.length} alerts`);
    console.log(`  📅 ${DAYS_BACK} days of data`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`\n💡 Restart the backend server and refresh the browser.`);

    await mongoose.disconnect();
}

seedHistory().catch(err => { console.error(err); process.exit(1); });
