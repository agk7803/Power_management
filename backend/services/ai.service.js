import EnergyData from "../Models/EnergyData.js";

/**
 * AI Anomaly Detection Service
 * Logic: Z-score based statistical detection using 7-day rolling window
 */

/**
 * Core Statistical Anomaly Logic
 * @param {string} classroomId - Mongoose ObjectId
 * @param {number} latestPower - The value to check
 * @returns {Promise<Object>} Analysis result
 */
export const calculateAnomalyStats = async (classroomId, latestPower) => {
    // 1. Fetch last 7 days of historical data for baseline
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Use .select and .lean for performance
    const history = await EnergyData.find({
        classroomId,
        timestamp: { $gte: sevenDaysAgo }
    })
        .select("power")
        .lean();

    if (history.length < 10) {
        const msg = "Insufficient historical data (need at least 10 samples for baseline)";
        return {
            isAnomaly: false,
            anomalyScore: 0,
            mean: 0,
            stdDev: 0,
            zScore: 0,
            reasons: [msg],
            message: msg
        };
    }

    // 2. Statistical Calculations
    const powers = history.map(h => h.power);
    const count = powers.length;
    const mean = powers.reduce((a, b) => a + b, 0) / count;

    const variance = powers.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
        const isAnom = latestPower > mean + 50;
        const msg = "Baseline variation is zero. Evaluating against fixed threshold.";
        return {
            isAnomaly: isAnom,
            severity: isAnom ? "MEDIUM" : null,
            anomalyScore: isAnom ? 2 : 0,
            mean,
            stdDev,
            zScore: 0,
            latestValue: latestPower,
            reasons: [msg],
            message: msg
        };
    }

    const zScore = (latestPower - mean) / stdDev;

    let isAnomaly = false;
    let severity = null;
    let message = "Consumption is within normal statistical limits.";

    if (zScore > 3) {
        isAnomaly = true;
        severity = "HIGH";
        message = `Critical Anomaly! Power (${latestPower}W) is over 3 standard deviations from mean (${mean.toFixed(1)}W).`;
    } else if (zScore > 2) {
        isAnomaly = true;
        severity = "MEDIUM";
        message = `Significant Anomaly. Power (${latestPower}W) exceeds 2 standard deviations.`;
    } else if (zScore > 1.5) {
        isAnomaly = true;
        severity = "LOW";
        message = `Minor deviation detected. Power is slightly above normal baseline.`;
    }

    const deviationPercent = ((latestPower - mean) / mean) * 100;

    return {
        isAnomaly,
        severity,
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        zScore,
        latestValue: latestPower,
        deviationPercent: Math.round(deviationPercent * 10) / 10,
        reasons: [message],
        message,
        anomalyScore: Math.abs(zScore) // Standardized score
    };
};

/**
 * Detects anomalies for the LATEST reading of a classroom
 * Used by the GET API
 */
export const detectClassroomAnomaly = async (classroomId) => {
    const latestReading = await EnergyData.findOne({ classroomId })
        .sort({ timestamp: -1 })
        .lean();

    if (!latestReading) {
        return { isAnomaly: false, message: "No data available for this classroom" };
    }

    return calculateAnomalyStats(classroomId, latestReading.power);
};
