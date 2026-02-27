/**
 * Forecast Controller — Node.js proxy to Python ML microservice
 *
 * The actual XGBRegressor (.pkl) runs in the Python Flask service
 * on port 5050.  This controller simply forwards requests from the
 * authenticated frontend to that service.
 *
 * Python service:  cd ml && python serve_model.py
 *
 * Endpoints served here:
 *   GET /api/ai/forecast   → proxied to http://localhost:5050/forecast
 *   GET /api/ai/efficiency → computed from MongoDB (power factor, voltage)
 */

import EnergyData from "../Models/EnergyData.js";
import mongoose from "mongoose";

const ML_SERVICE = process.env.ML_SERVICE_URL || "http://localhost:5050";

/* ── Helper: call the Python ML service ──────────────────────────────── */
async function callML(path) {
    const url = `${ML_SERVICE}${path}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`ML service error ${res.status}: ${text}`);
    }
    return res.json();
}

/* ── Helper: stats ───────────────────────────────────────────────────── */
function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stddev(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/* ══════════════════════════════════════════════════════════════════════
   GET /api/ai/forecast
   Proxied entirely from Python ML service (XGBoost pkl)
   ══════════════════════════════════════════════════════════════════════ */
export const getForecast = async (req, res) => {
    try {
        const data = await callML("/forecast");
        return res.json(data);
    } catch (err) {
        console.error("Forecast proxy error:", err.message);

        // If the ML service is not running yet, return a clear message
        return res.status(503).json({
            message: "ML service unavailable. Run: cd ml && python serve_model.py",
            forecast24h: [],
            forecastTomorrow: [],
            modelStats: {
                mae: 0, rmse: 0, r2: 0, trainSize: 0, testSize: 0,
                algorithm: "XGBoost (service offline)", features: 14
            },
            featureImportance: [],
            weeklyForecast: [],
            serviceOffline: true,
        });
    }
};

/* ══════════════════════════════════════════════════════════════════════
   GET /api/ai/efficiency
   Power factor, voltage stability, daily peak — from both:
     • MongoDB (campus real data)
     • Python ML service /peak (model-based daily peak)
   ══════════════════════════════════════════════════════════════════════ */
export const getEfficiency = async (req, res) => {
    try {
        const classroomId = req.query.classroomId || null;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const matchQuery = { timestamp: { $gte: thirtyDaysAgo, $lte: now } };
        if (classroomId) {
            matchQuery.classroomId = new mongoose.Types.ObjectId(classroomId);
        }

        // Fetch DB readings for power factor / voltage
        const readings = await EnergyData.find(matchQuery)
            .select("power voltage current energy cost co2 timestamp")
            .lean();

        // ── Power factor calculation ──────────────────────────────────────
        const LOW_PF_THRESHOLD = 0.85;
        const pfValues = [];
        const apparentPowerValues = [];
        let lowPFCount = 0;

        readings.forEach(r => {
            const S = r.voltage > 0 && r.current > 0
                ? (r.voltage * r.current) / 1000
                : r.power / 1000 / 0.9;
            const P = r.power / 1000;
            const pf = S > 0 ? Math.min(1, P / S) : 0.9;
            pfValues.push(pf);
            apparentPowerValues.push(S);
            if (pf < LOW_PF_THRESHOLD) lowPFCount++;
        });

        const avgPF = pfValues.length ? mean(pfValues) : 0;

        // ── Voltage stability ─────────────────────────────────────────────
        const voltages = readings.map(r => r.voltage).filter(v => v > 0);
        const avgV = mean(voltages);
        const stdV = stddev(voltages);

        // ── Hourly efficiency (last 7 days) ───────────────────────────────
        const hourlyEff = await EnergyData.aggregate([
            { $match: { ...matchQuery, timestamp: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } },
            {
                $group: {
                    _id: { $hour: "$timestamp" },
                    avgPower: { $avg: "$power" },
                    avgVoltage: { $avg: "$voltage" },
                    avgCurrent: { $avg: "$current" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const hourlyEfficiency = Array.from({ length: 24 }, (_, h) => {
            const found = hourlyEff.find(e => e._id === h);
            if (!found) return { hour: h, label: `${String(h).padStart(2, "0")}:00`, avgPowerKW: 0, avgPF: 0.9 };
            const S = found.avgVoltage > 0 && found.avgCurrent > 0
                ? (found.avgVoltage * found.avgCurrent) / 1000
                : found.avgPower / 1000 / 0.9;
            const pf = S > 0 ? Math.min(1, (found.avgPower / 1000) / S) : 0.9;
            return {
                hour: h,
                label: `${String(h).padStart(2, "0")}:00`,
                avgPowerKW: parseFloat((found.avgPower / 1000).toFixed(3)),
                avgPF: parseFloat(pf.toFixed(3))
            };
        });

        // ── Efficiency score ──────────────────────────────────────────────
        const pfScore = Math.min(100, avgPF * 100);
        const voltageScore = stdV < 5 ? 100 : stdV < 10 ? 80 : 60;
        const anomalyCount = await EnergyData.countDocuments({ ...matchQuery, isAnomaly: true });
        const anomalyRate = readings.length > 0 ? anomalyCount / readings.length : 0;
        const anomalyScore = Math.max(0, 100 - anomalyRate * 500);
        const overallScore = Math.round(pfScore * 0.4 + voltageScore * 0.3 + anomalyScore * 0.3);
        const grade = overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 70 ? "C" : overallScore >= 60 ? "D" : "F";

        // ── Try fetching model-based daily peak from Python service ───────
        let modelDailyPeak = null;
        let modelStats = null;
        try {
            const peakData = await callML("/peak");
            modelDailyPeak = peakData.dailyPeak || [];
            modelStats = peakData.stats || null;
        } catch (_) {
            // ML service offline — fall back to MongoDB aggregation
        }

        // MongoDB daily peak fallback
        const dbDailyPeak = await EnergyData.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    peakKW: { $max: { $divide: ["$power", 1000] } },
                    avgKW: { $avg: { $divide: ["$power", 1000] } },
                    totalCost: { $sum: "$cost" },
                    totalEnergy: { $sum: "$energy" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const dailyPeak = dbDailyPeak.map(d => ({
            date: d._id,
            peakKW: parseFloat(d.peakKW.toFixed(3)),
            avgKW: parseFloat(d.avgKW.toFixed(3)),
            totalCost: parseFloat(d.totalCost.toFixed(2)),
            totalEnergy: parseFloat(d.totalEnergy.toFixed(4)),
            // If ML service is online, merge model peak prediction
            peakPredKW: modelDailyPeak
                ? (() => {
                    const m = modelDailyPeak.find(x => x.date === d._id);
                    return m ? m.peakPredKW : null;
                })()
                : null
        }));

        return res.json({
            powerFactor: {
                avg: parseFloat(avgPF.toFixed(3)),
                low: lowPFCount,
                lowPercent: parseFloat(readings.length ? (lowPFCount / readings.length * 100).toFixed(2) : 0),
                threshold: LOW_PF_THRESHOLD
            },
            apparentPower: {
                avg: parseFloat(mean(apparentPowerValues).toFixed(3)),
                max: parseFloat(Math.max(...apparentPowerValues, 0).toFixed(3))
            },
            dailyPeak,
            modelDailyPeak: modelDailyPeak || [],    // raw ML data if available
            modelPeakStats: modelStats,               // overall ML stats
            voltageStability: {
                avg: parseFloat(avgV.toFixed(1)),
                std: parseFloat(stdV.toFixed(2)),
                min: parseFloat((Math.min(...voltages, 0)).toFixed(1)),
                max: parseFloat((Math.max(...voltages, 0)).toFixed(1))
            },
            hourlyEfficiency,
            efficiency: {
                score: overallScore, grade,
                pfScore: Math.round(pfScore),
                voltageScore,
                anomalyScore: Math.round(anomalyScore),
                totalReadings: readings.length,
                anomalyCount
            }
        });
    } catch (error) {
        console.error("Efficiency analysis error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
