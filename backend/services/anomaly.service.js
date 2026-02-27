/**
 * AI Anomaly Detection Service
 *
 * Hybrid detection using 3 methods:
 * 1. Statistical Deviation — z-score from rolling mean ± 2σ
 * 2. Occupancy-Based — power > idle when room is empty
 * 3. Schedule Mismatch — energy consumed during unscheduled hours
 */

import EnergyData from "../Models/EnergyData.js";
import Timetable from "../Models/Timetable.js";

const Z_SCORE_THRESHOLD = 2.0;
const IDLE_THRESHOLD_WATTS = 50;
const STANDBY_THRESHOLD_WATTS = 200;
const WINDOW_SIZE = 50;   // last N readings for rolling stats

/**
 * Run full hybrid anomaly detection
 * @param {Object} params
 * @param {string} params.deviceId - Mongoose ObjectId of device
 * @param {string} params.classroomId - Mongoose ObjectId of classroom
 * @param {number} params.power - Current reading in watts
 * @param {number} params.occupancy - Current occupancy count
 * @returns {Object} { isAnomaly, anomalyScore, reasons[] }
 */
export const detectAnomaly = async ({ deviceId, classroomId, power, occupancy = 0 }) => {
    const reasons = [];
    let anomalyScore = 0;

    // ── 1. Statistical Deviation ──────────────────────────────
    const statsQuery = deviceId ? { deviceId } : { classroomId };
    const recentReadings = await EnergyData.find(statsQuery)
        .sort({ timestamp: -1 })
        .limit(WINDOW_SIZE)
        .select("power")
        .lean();

    if (recentReadings.length >= 10) {
        const powers = recentReadings.map(r => r.power);
        const mean = powers.reduce((a, b) => a + b, 0) / powers.length;
        const variance = powers.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / powers.length;
        const stddev = Math.sqrt(variance);

        if (stddev > 0) {
            const zScore = Math.abs((power - mean) / stddev);
            if (zScore > Z_SCORE_THRESHOLD) {
                anomalyScore += zScore;
                reasons.push(`Statistical deviation: z-score ${zScore.toFixed(2)} exceeds threshold ${Z_SCORE_THRESHOLD}`);
            }
        }
    }

    // ── 2. Occupancy-Based Detection ──────────────────────────
    if (occupancy === 0 && power > IDLE_THRESHOLD_WATTS) {
        anomalyScore += 1.5;
        reasons.push(`Empty room consuming ${power}W (threshold: ${IDLE_THRESHOLD_WATTS}W)`);
    }

    // ── 3. Schedule Mismatch Detection ────────────────────────
    if (classroomId) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        const scheduledClasses = await Timetable.find({
            classroomId,
            dayOfWeek
        }).lean();

        const isScheduled = scheduledClasses.some(
            cls => currentTime >= cls.startTime && currentTime <= cls.endTime
        );

        if (!isScheduled && power > STANDBY_THRESHOLD_WATTS) {
            anomalyScore += 1.0;
            reasons.push(`No class scheduled but power is ${power}W (standby threshold: ${STANDBY_THRESHOLD_WATTS}W)`);
        }

        if (isScheduled && power < IDLE_THRESHOLD_WATTS) {
            anomalyScore += 0.5;
            reasons.push(`Class scheduled but power is only ${power}W — equipment may be off`);
        }
    }

    return {
        isAnomaly: anomalyScore >= 1.5,
        anomalyScore: Math.round(anomalyScore * 100) / 100,
        reasons
    };
};
