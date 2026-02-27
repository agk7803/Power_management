import EnergyData from "../Models/EnergyData.js";
import Classroom from "../Models/Classroom.js";
import CampusSettings from "../Models/CampusSettings.js";
import { calculateCost, calculateCO2, detectIdle } from "../services/energy.service.js";
import { calculateAnomalyStats } from "../services/ai.service.js";
import { createAnomalyAlert, createIdleAlert } from "../services/alert.service.js";

/* ──────────────────────────────────────
   Helper: Process a single classroom reading
────────────────────────────────────── */
async function processReading({ classroomObjId, voltage, current, power, energy, occupancy }) {
    // Fetch campus settings for tariff/CO₂
    const campus = await CampusSettings.findOne();
    const tariff = campus?.electricityTariff || 8;
    const co2Factor = campus?.co2Factor || 0.82;

    // Calculate cost & CO₂
    const cost = calculateCost(energy, tariff);
    const co2 = calculateCO2(energy, co2Factor);

    // Detect idle
    const isIdle = detectIdle(power);

    // AI Anomaly detection (Statistical Z-Score)
    const anomalyResult = await calculateAnomalyStats(classroomObjId, power);

    // Store energy data
    const energyDoc = await EnergyData.create({
        classroomId: classroomObjId,
        timestamp: new Date(),
        voltage: voltage || 230,
        current: current || 0,
        power,
        energy,
        cost,
        co2,
        isAnomaly: anomalyResult.isAnomaly,
        isIdle,
        anomalyScore: anomalyResult.anomalyScore,
        metadata: {
            occupancy: occupancy || 0,
            scheduledClass: false,
            aiBaseline: {
                mean: anomalyResult.mean,
                stdDev: anomalyResult.stdDev,
                zScore: anomalyResult.zScore,
                reasons: anomalyResult.reasons
            }
        }
    });

    // Create alerts if needed
    if (anomalyResult.isAnomaly) {
        await createAnomalyAlert({
            classroomId: classroomObjId,
            energyDataId: energyDoc._id,
            anomalyScore: anomalyResult.anomalyScore,
            reasons: anomalyResult.reasons
        });
    }

    if (isIdle) {
        const Alert = (await import("../Models/Alert.js")).default;
        const recentIdleAlert = await Alert.findOne({
            classroomId: classroomObjId,
            type: "IDLE",
            createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
        });
        if (!recentIdleAlert) {
            await createIdleAlert({
                classroomId: classroomObjId,
                energyDataId: energyDoc._id,
                power
            });
        }
    }

    return {
        power,
        energy,
        cost,
        co2,
        isAnomaly: anomalyResult.isAnomaly,
        isIdle,
        anomalyScore: anomalyResult.anomalyScore
    };
}

/* ──────────────────────────────────────
   POST /api/energy/ingest
   Accepts ESP32 batch format:
   {
     "classes": [
       { "classid": "A33", "occupied": 1, "voltage": 243.2, "current": 0, "power": 0.5, "energy": 0.009 },
       { "classid": "B22", "occupied": 1, "voltage": 243.3, "current": 0, "power": 0.5, "energy": 0.002 }
     ]
   }
   Also supports single-classroom format:
   { "classroomId": "C101", "voltage": 228.5, "current": 6.1, "power": 1393, "energy": 1.39 }
────────────────────────────────────── */
export const ingestEnergy = async (req, res) => {
    try {
        const { classes, classroomId: classroomIdStr, classid } = req.body;

        // ── ESP32 Batch Format: { classes: [...] } ──
        if (classes && Array.isArray(classes)) {
            const results = [];
            const errors = [];

            for (const entry of classes) {
                const id = entry.classid || entry.classroomId;
                if (!id) {
                    errors.push({ error: "Missing classid", entry });
                    continue;
                }

                const classroom = await Classroom.findOne({ classroomId: id });
                if (!classroom) {
                    errors.push({ classid: id, error: `Classroom "${id}" not found` });
                    continue;
                }

                const result = await processReading({
                    classroomObjId: classroom._id,
                    voltage: entry.voltage,
                    current: entry.current,
                    power: entry.power,
                    energy: entry.energy,
                    occupancy: entry.occupied || entry.occupancy || 0
                });

                results.push({ classid: id, ...result });
            }

            return res.status(201).json({
                message: `Ingested ${results.length} reading(s)`,
                results,
                errors: errors.length > 0 ? errors : undefined
            });
        }

        // ── Single classroom format: { classroomId: "C101", ... } or { classid: "C101", ... } ──
        const singleId = classroomIdStr || classid;
        if (singleId) {
            const classroom = await Classroom.findOne({ classroomId: singleId });
            if (!classroom) {
                return res.status(404).json({ message: `Classroom "${singleId}" not found` });
            }

            const result = await processReading({
                classroomObjId: classroom._id,
                voltage: req.body.voltage,
                current: req.body.current,
                power: req.body.power,
                energy: req.body.energy,
                occupancy: req.body.occupied || req.body.occupancy || 0
            });

            return res.status(201).json({
                message: "Energy data ingested",
                data: result
            });
        }

        return res.status(400).json({ message: "Invalid format. Send { classes: [...] } or { classroomId: \"...\", ... }" });

    } catch (error) {
        console.error("Ingest energy error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/energy/latest — Get latest readings for all classrooms (or one classroom)
export const getLatestReadings = async (req, res) => {
    try {
        const { classroomId } = req.query;

        // If classroomId provided, return single latest reading for that classroom
        if (classroomId) {
            const latest = await EnergyData.findOne({ classroomId })
                .sort({ timestamp: -1 })
                .lean();
            if (!latest) return res.json(null);

            return res.json(latest);
        }

        // Otherwise return latest reading for all classrooms that have data
        const classrooms = await Classroom.find().lean();
        const readings = [];

        for (const classroom of classrooms) {
            const latest = await EnergyData.findOne({ classroomId: classroom._id })
                .sort({ timestamp: -1 })
                .lean();
            if (latest) {
                readings.push({
                    ...latest,
                    classroomName: classroom.name,
                    classroomCode: classroom.classroomId
                });
            }
        }

        res.json(readings);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/energy/history/:classroomId — Historical data with optional time range or specific date
export const getEnergyHistory = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const { hours = 24, date, from, to } = req.query;

        let query = { classroomId };

        if (from && to) {
            // Date range (from/to as YYYY-MM-DD)
            const startOfRange = new Date(from);
            startOfRange.setHours(0, 0, 0, 0);
            const endOfRange = new Date(to);
            endOfRange.setHours(23, 59, 59, 999);
            query.timestamp = { $gte: startOfRange, $lte: endOfRange };
        } else if (date) {
            // Filter by specific date (YYYY-MM-DD)
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            query.timestamp = { $gte: startOfDay, $lte: endOfDay };
        } else {
            // Default to last X hours
            const since = new Date(Date.now() - hours * 60 * 60 * 1000);
            query.timestamp = { $gte: since };
        }

        const data = await EnergyData.find(query)
            .sort({ timestamp: -1 })
            .limit(5000)
            .lean();

        res.json(data);
    } catch (error) {
        console.error("Get history error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
