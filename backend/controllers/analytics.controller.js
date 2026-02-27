/**
 * Analytics Controller
 * Provides aggregated analytics endpoints for the frontend Analytics page.
 * All endpoints accept optional ?from=YYYY-MM-DD&to=YYYY-MM-DD query params.
 */

import EnergyData from "../Models/EnergyData.js";
import Classroom from "../Models/Classroom.js";
import mongoose from "mongoose";

/* ──────────────────────────────────────
   Helper: parse date range from query
────────────────────────────────────── */
function getDateRange(query) {
    const { from, to } = query;
    if (from && to) {
        // Since the app is focused on India (+5:30), but new Date("YYYY-MM-DD") creates UTC
        // we shift it to ensure we capture the full local day.
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        // Expand window slightly (-6h) to capture IST start-of-day in UTC
        const adjustedStart = new Date(start.getTime() - 6 * 60 * 60 * 1000);

        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        // Expand window slightly (+6h) to capture IST end-of-day in UTC
        const adjustedEnd = new Date(end.getTime() + 6 * 60 * 60 * 1000);

        return { $gte: adjustedStart, $lte: adjustedEnd };
    }
    // Default: last 7 days (inclusive of today's UTC boundaries)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    weekAgo.setHours(0, 0, 0, 0);
    return { $gte: weekAgo, $lte: now };
}

function todayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start, end };
}

function yesterdayRange() {
    const { start } = todayRange();
    const yStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const yEnd = new Date(start.getTime() - 1);
    return { start: yStart, end: yEnd };
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. GET /api/analytics/trends
   Energy consumption trends: hourly, today vs yesterday, peak hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const getTrends = async (req, res) => {
    try {
        const dateRange = getDateRange(req.query);
        const classroomId = req.query.classroomId || null;

        const match = { timestamp: dateRange };
        if (classroomId) match.classroomId = new mongoose.Types.ObjectId(classroomId);

        // ── Hourly aggregation ──
        const hourly = await EnergyData.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $hour: "$timestamp" },
                    avgPower: { $avg: "$power" },
                    totalEnergy: { $sum: "$energy" },
                    totalCost: { $sum: "$cost" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const hourlyData = Array.from({ length: 24 }, (_, i) => {
            const found = hourly.find(h => h._id === i);
            return {
                hour: i,
                avgPower: found ? Math.round(found.avgPower) : 0,
                totalEnergy: found ? parseFloat(found.totalEnergy.toFixed(4)) : 0,
                totalCost: found ? parseFloat(found.totalCost.toFixed(2)) : 0,
                count: found ? found.count : 0
            };
        });

        // Peak hours (top 3 by avg power)
        const peakHours = [...hourlyData]
            .sort((a, b) => b.avgPower - a.avgPower)
            .slice(0, 3)
            .map(h => ({ hour: h.hour, avgPower: h.avgPower }));

        // ── Today vs Yesterday comparison ──
        const { start: tStart, end: tEnd } = todayRange();
        const { start: yStart, end: yEnd } = yesterdayRange();

        const todayMatch = { timestamp: { $gte: tStart, $lte: tEnd } };
        const yesterdayMatch = { timestamp: { $gte: yStart, $lte: yEnd } };
        if (classroomId) {
            const rid = new mongoose.Types.ObjectId(classroomId);
            todayMatch.classroomId = rid;
            yesterdayMatch.classroomId = rid;
        }

        const [todayAgg] = await EnergyData.aggregate([
            { $match: todayMatch },
            { $group: { _id: null, energy: { $sum: "$energy" }, cost: { $sum: "$cost" }, co2: { $sum: "$co2" }, avgPower: { $avg: "$power" } } }
        ]);

        const [yesterdayAgg] = await EnergyData.aggregate([
            { $match: yesterdayMatch },
            { $group: { _id: null, energy: { $sum: "$energy" }, cost: { $sum: "$cost" }, co2: { $sum: "$co2" }, avgPower: { $avg: "$power" } } }
        ]);

        // ── Daily breakdown ──
        const daily = await EnergyData.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    totalEnergy: { $sum: "$energy" },
                    totalCost: { $sum: "$cost" },
                    avgPower: { $avg: "$power" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // ── Totals ──
        const [totals] = await EnergyData.aggregate([
            { $match: match },
            { $group: { _id: null, energy: { $sum: "$energy" }, cost: { $sum: "$cost" }, co2: { $sum: "$co2" }, count: { $sum: 1 } } }
        ]);

        // ── Weekday vs Weekend ──
        const weekdayWeekend = await EnergyData.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $in: [{ $dayOfWeek: "$timestamp" }, [1, 7]] },
                            "weekend",
                            "weekday"
                        ]
                    },
                    avgPower: { $avg: "$power" },
                    totalEnergy: { $sum: "$energy" }
                }
            }
        ]);

        res.json({
            hourly: hourlyData,
            peakHours,
            today: todayAgg || { energy: 0, cost: 0, co2: 0, avgPower: 0 },
            yesterday: yesterdayAgg || { energy: 0, cost: 0, co2: 0, avgPower: 0 },
            daily,
            totals: totals || { energy: 0, cost: 0, co2: 0, count: 0 },
            weekdayWeekend: weekdayWeekend.reduce((acc, w) => {
                acc[w._id] = { avgPower: Math.round(w.avgPower), totalEnergy: parseFloat(w.totalEnergy.toFixed(4)) };
                return acc;
            }, { weekday: { avgPower: 0, totalEnergy: 0 }, weekend: { avgPower: 0, totalEnergy: 0 } })
        });
    } catch (error) {
        console.error("Analytics trends error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. GET /api/analytics/peak
   Peak load & demand analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const getPeakAnalysis = async (req, res) => {
    try {
        const dateRange = getDateRange(req.query);
        const classroomId = req.query.classroomId || null;

        const match = { timestamp: dateRange };
        if (classroomId) match.classroomId = new mongoose.Types.ObjectId(classroomId);

        // Peak power per day
        const peakPerDay = await EnergyData.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    peakPower: { $max: "$power" },
                    avgPower: { $avg: "$power" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Overall stats
        const [stats] = await EnergyData.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    maxPower: { $max: "$power" },
                    avgPower: { $avg: "$power" },
                    minPower: { $min: "$power" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Time of overall peak
        const peakReading = await EnergyData.findOne(match)
            .sort({ power: -1 })
            .select("power timestamp classroomId")
            .populate("classroomId", "classroomId name")
            .lean();

        // Top 10 highest readings
        const top10 = await EnergyData.find(match)
            .sort({ power: -1 })
            .limit(10)
            .select("power timestamp classroomId voltage current")
            .populate("classroomId", "classroomId name")
            .lean();

        // Load distribution histogram (power buckets)
        const bucketSize = 200;
        const histogram = await EnergyData.aggregate([
            { $match: match },
            {
                $bucket: {
                    groupBy: "$power",
                    boundaries: [0, 200, 400, 600, 800, 1000, 1500, 2000, 3000, 5000, 10000],
                    default: "10000+",
                    output: { count: { $sum: 1 }, avgPower: { $avg: "$power" } }
                }
            }
        ]);

        res.json({
            peakPerDay,
            stats: stats || { maxPower: 0, avgPower: 0, minPower: 0, count: 0 },
            peakReading: peakReading ? {
                power: peakReading.power,
                time: peakReading.timestamp,
                classroom: peakReading.classroomId?.name || "Unknown",
                classroomCode: peakReading.classroomId?.classroomId || ""
            } : null,
            top10: top10.map(r => ({
                power: r.power,
                time: r.timestamp,
                classroom: r.classroomId?.name || "Unknown",
                classroomCode: r.classroomId?.classroomId || "",
                voltage: r.voltage,
                current: r.current
            })),
            histogram: histogram.map(b => ({
                range: b._id === "10000+" ? "10000+" : `${b._id}-${b._id + bucketSize}`,
                rangeLabel: b._id === "10000+" ? "10kW+" : `${b._id}-${b._id >= 1000 ? b._id + 500 : b._id + 200}W`,
                count: b.count
            }))
        });
    } catch (error) {
        console.error("Analytics peak error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. GET /api/analytics/anomalies
   AI-based anomaly detection analytics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const getAnomalyAnalytics = async (req, res) => {
    try {
        const dateRange = getDateRange(req.query);
        const classroomId = req.query.classroomId || null;

        const match = { timestamp: dateRange };
        if (classroomId) match.classroomId = new mongoose.Types.ObjectId(classroomId);

        // Anomaly count by day
        const anomalyByDay = await EnergyData.aggregate([
            { $match: { ...match, isAnomaly: true } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    count: { $sum: 1 },
                    avgScore: { $avg: "$anomalyScore" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Total anomaly stats
        const [anomalyStats] = await EnergyData.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalReadings: { $sum: 1 },
                    totalAnomalies: { $sum: { $cond: ["$isAnomaly", 1, 0] } },
                    avgAnomalyScore: { $avg: { $cond: ["$isAnomaly", "$anomalyScore", null] } },
                    maxAnomalyScore: { $max: "$anomalyScore" }
                }
            }
        ]);

        // Top anomalous classrooms
        const topAnomalousRooms = await EnergyData.aggregate([
            { $match: { ...match, isAnomaly: true } },
            {
                $group: {
                    _id: "$classroomId",
                    count: { $sum: 1 },
                    avgScore: { $avg: "$anomalyScore" },
                    maxPower: { $max: "$power" }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "classrooms",
                    localField: "_id",
                    foreignField: "_id",
                    as: "classroom"
                }
            },
            { $unwind: { path: "$classroom", preserveNullAndEmptyArrays: true } }
        ]);

        // Recent anomaly readings with details
        const recentAnomalies = await EnergyData.find({ ...match, isAnomaly: true })
            .sort({ timestamp: -1 })
            .limit(20)
            .select("power energy timestamp anomalyScore classroomId metadata voltage current")
            .populate("classroomId", "classroomId name")
            .lean();

        // Anomaly score trend (hourly avg)
        const scoreTrend = await EnergyData.aggregate([
            { $match: { ...match, isAnomaly: true } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                        hour: { $hour: "$timestamp" }
                    },
                    avgScore: { $avg: "$anomalyScore" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.date": 1, "_id.hour": 1 } },
            { $limit: 100 }
        ]);

        // Root cause analysis
        const rootCauses = [];
        for (const r of recentAnomalies.slice(0, 10)) {
            const causes = [];
            if (r.metadata?.occupancy === 0 && r.power > 50) {
                causes.push("Power on with zero occupancy");
            }
            if (r.power > 2000) {
                causes.push("Extremely high power draw (possible overload)");
            }
            const hour = new Date(r.timestamp).getHours();
            if (hour < 6 || hour > 22) {
                causes.push("Power usage during off-hours");
            }
            if (r.anomalyScore > 3) {
                causes.push("Statistical outlier — sudden surge");
            }
            rootCauses.push({
                classroomCode: r.classroomId?.classroomId || "Unregistered",
                classroomName: r.classroomId?.name || "Legacy Workspace",
                power: r.power,
                time: r.timestamp,
                score: r.anomalyScore,
                baseline: r.metadata?.aiBaseline || null,
                causes: causes.length > 0 ? causes : ["Unusual deviation from baseline"]
            });
        }

        res.json({
            anomalyByDay,
            stats: anomalyStats || { totalReadings: 0, totalAnomalies: 0, avgAnomalyScore: 0, maxAnomalyScore: 0 },
            topRooms: topAnomalousRooms.map(r => ({
                classroomCode: r.classroom?.classroomId || "Unregistered",
                classroomName: r.classroom?.name || "Legacy Workspace",
                count: r.count,
                avgScore: parseFloat(r.avgScore.toFixed(2)),
                maxPower: r.maxPower
            })),
            recent: recentAnomalies.map(r => ({
                classroomCode: r.classroomId?.classroomId || "Unregistered",
                classroomName: r.classroomId?.name || "Legacy Workspace",
                power: r.power,
                time: r.timestamp,
                score: r.anomalyScore,
                occupancy: r.metadata?.occupancy || 0,
                baseline: r.metadata?.aiBaseline || null
            })),
            scoreTrend,
            rootCauses
        });
    } catch (error) {
        console.error("Analytics anomaly error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. GET /api/analytics/idle
   Idle energy detection analytics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const getIdleAnalytics = async (req, res) => {
    try {
        const dateRange = getDateRange(req.query);
        const classroomId = req.query.classroomId || null;

        const match = { timestamp: dateRange };
        if (classroomId) match.classroomId = new mongoose.Types.ObjectId(classroomId);

        // Idle energy per day
        const idleByDay = await EnergyData.aggregate([
            { $match: { ...match, isIdle: true } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    energy: { $sum: "$energy" },
                    cost: { $sum: "$cost" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Total idle stats
        const [idleStats] = await EnergyData.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalReadings: { $sum: 1 },
                    idleReadings: { $sum: { $cond: ["$isIdle", 1, 0] } },
                    idleEnergy: { $sum: { $cond: ["$isIdle", "$energy", 0] } },
                    idleCost: { $sum: { $cond: ["$isIdle", "$cost", 0] } },
                    idleCO2: { $sum: { $cond: ["$isIdle", "$co2", 0] } },
                    totalEnergy: { $sum: "$energy" },
                    totalCost: { $sum: "$cost" }
                }
            }
        ]);

        // Top idle classrooms
        const topIdle = await EnergyData.aggregate([
            { $match: { ...match, isIdle: true } },
            {
                $group: {
                    _id: "$classroomId",
                    idleEnergy: { $sum: "$energy" },
                    idleCost: { $sum: "$cost" },
                    idleCount: { $sum: 1 },
                    avgPower: { $avg: "$power" }
                }
            },
            { $sort: { idleCost: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "classrooms",
                    localField: "_id",
                    foreignField: "_id",
                    as: "classroom"
                }
            },
            { $unwind: { path: "$classroom", preserveNullAndEmptyArrays: true } }
        ]);

        // Smart logic: occupancy=0 AND power>threshold AND scheduledClass=false
        const wasteReadings = await EnergyData.aggregate([
            {
                $match: {
                    ...match,
                    "metadata.occupancy": 0,
                    "metadata.scheduledClass": false,
                    power: { $gt: 50 }
                }
            },
            {
                $group: {
                    _id: null,
                    wasteEnergy: { $sum: "$energy" },
                    wasteCost: { $sum: "$cost" },
                    wasteCount: { $sum: 1 }
                }
            }
        ]);

        const s = idleStats || { totalReadings: 0, idleReadings: 0, idleEnergy: 0, idleCost: 0, idleCO2: 0, totalEnergy: 0, totalCost: 0 };

        // Approximate idle hours: each reading represents ~5 seconds
        const idleHours = parseFloat((s.idleReadings * 5 / 3600).toFixed(1));

        res.json({
            idleByDay,
            stats: {
                idleEnergy: parseFloat(s.idleEnergy.toFixed(4)),
                idleCost: parseFloat(s.idleCost.toFixed(2)),
                idleCO2: parseFloat(s.idleCO2.toFixed(3)),
                idleHours,
                idleReadings: s.idleReadings,
                totalReadings: s.totalReadings,
                idlePercent: s.totalReadings > 0 ? parseFloat((s.idleReadings / s.totalReadings * 100).toFixed(1)) : 0,
                totalEnergy: parseFloat(s.totalEnergy.toFixed(4)),
                totalCost: parseFloat(s.totalCost.toFixed(2))
            },
            topIdle: topIdle.map(r => ({
                classroomCode: r.classroom?.classroomId || "??",
                classroomName: r.classroom?.name || "Unknown",
                idleEnergy: parseFloat(r.idleEnergy.toFixed(4)),
                idleCost: parseFloat(r.idleCost.toFixed(2)),
                idleCount: r.idleCount,
                avgPower: Math.round(r.avgPower)
            })),
            smartWaste: wasteReadings[0] || { wasteEnergy: 0, wasteCost: 0, wasteCount: 0 }
        });
    } catch (error) {
        console.error("Analytics idle error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   5. GET /api/analytics/compare
   This week vs last week comparison
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const getComparison = async (req, res) => {
    try {
        const classroomId = req.query.classroomId || null;

        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sunday
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - dayOfWeek);
        thisWeekStart.setHours(0, 0, 0, 0);

        const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);

        const buildMatch = (start, end) => {
            const m = { timestamp: { $gte: start, $lte: end } };
            if (classroomId) m.classroomId = new mongoose.Types.ObjectId(classroomId);
            return m;
        };

        const [thisWeek] = await EnergyData.aggregate([
            { $match: buildMatch(thisWeekStart, now) },
            { $group: { _id: null, energy: { $sum: "$energy" }, cost: { $sum: "$cost" }, co2: { $sum: "$co2" }, avgPower: { $avg: "$power" }, anomalies: { $sum: { $cond: ["$isAnomaly", 1, 0] } } } }
        ]);

        const [lastWeek] = await EnergyData.aggregate([
            { $match: buildMatch(lastWeekStart, lastWeekEnd) },
            { $group: { _id: null, energy: { $sum: "$energy" }, cost: { $sum: "$cost" }, co2: { $sum: "$co2" }, avgPower: { $avg: "$power" }, anomalies: { $sum: { $cond: ["$isAnomaly", 1, 0] } } } }
        ]);

        // Daily breakdown for both weeks
        const thisWeekDaily = await EnergyData.aggregate([
            { $match: buildMatch(thisWeekStart, now) },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    energy: { $sum: "$energy" },
                    cost: { $sum: "$cost" },
                    avgPower: { $avg: "$power" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const lastWeekDaily = await EnergyData.aggregate([
            { $match: buildMatch(lastWeekStart, lastWeekEnd) },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    energy: { $sum: "$energy" },
                    cost: { $sum: "$cost" },
                    avgPower: { $avg: "$power" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const tw = thisWeek || { energy: 0, cost: 0, co2: 0, avgPower: 0, anomalies: 0 };
        const lw = lastWeek || { energy: 0, cost: 0, co2: 0, avgPower: 0, anomalies: 0 };

        const pctChange = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return parseFloat(((curr - prev) / prev * 100).toFixed(1));
        };

        res.json({
            thisWeek: { energy: parseFloat(tw.energy.toFixed(4)), cost: parseFloat(tw.cost.toFixed(2)), co2: parseFloat(tw.co2.toFixed(3)), avgPower: Math.round(tw.avgPower), anomalies: tw.anomalies },
            lastWeek: { energy: parseFloat(lw.energy.toFixed(4)), cost: parseFloat(lw.cost.toFixed(2)), co2: parseFloat(lw.co2.toFixed(3)), avgPower: Math.round(lw.avgPower), anomalies: lw.anomalies },
            change: {
                energy: pctChange(tw.energy, lw.energy),
                cost: pctChange(tw.cost, lw.cost),
                co2: pctChange(tw.co2, lw.co2)
            },
            thisWeekDaily,
            lastWeekDaily
        });
    } catch (error) {
        console.error("Analytics compare error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
