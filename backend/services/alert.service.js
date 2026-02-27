/**
 * Alert Creation Service
 * Creates alerts when anomalies, idle states, or mismatches are detected
 */

import Alert from "../Models/Alert.js";

/**
 * Determine severity from anomaly score
 */
const getSeverity = (score) => {
    if (score >= 4) return "CRITICAL";
    if (score >= 3) return "HIGH";
    if (score >= 2) return "MEDIUM";
    return "LOW";
};

/**
 * Create an anomaly alert
 */
export const createAnomalyAlert = async ({ deviceId, classroomId, energyDataId, anomalyScore, reasons }) => {
    const alert = await Alert.create({
        deviceId,
        classroomId,
        type: "ANOMALY",
        severity: getSeverity(anomalyScore),
        message: reasons.join("; "),
        energyDataId
    });
    console.log(`🚨 Alert created: [${alert.severity}] ${alert.message}`);
    return alert;
};

/**
 * Create an idle alert
 */
export const createIdleAlert = async ({ deviceId, classroomId, energyDataId, power }) => {
    const alert = await Alert.create({
        deviceId,
        classroomId,
        type: "IDLE",
        severity: "LOW",
        message: `Device idle — power is ${power}W`,
        energyDataId
    });
    return alert;
};

/**
 * Create an offline alert
 */
export const createOfflineAlert = async ({ deviceId, classroomId }) => {
    const alert = await Alert.create({
        deviceId,
        classroomId,
        type: "OFFLINE",
        severity: "HIGH",
        message: "Device has gone offline — no heartbeat received"
    });
    console.log(`🔴 Offline alert for device ${deviceId}`);
    return alert;
};
