import AutomationLog from "../Models/AutomationLog.js";
import Classroom from "../Models/Classroom.js";
import Alert from "../Models/Alert.js";
import EnergyData from "../Models/EnergyData.js";
import { getClassroomAutomationStatus } from "../services/scheduler.service.js";

/**
 * GET /api/automation/status
 * Returns current schedule/power status for all classrooms
 */
export const getAutomationStatus = async (req, res) => {
    try {
        const statuses = await getClassroomAutomationStatus();
        res.json(statuses);
    } catch (error) {
        console.error("Automation status error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET /api/automation/logs
 * Returns recent automation log entries
 */
export const getAutomationLogs = async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const logs = await AutomationLog.find()
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .populate("classroomId", "classroomId name")
            .lean();
        res.json(logs);
    } catch (error) {
        console.error("Automation logs error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /api/automation/turnoff/:classroomId
 * Manual trigger to "turn off" a classroom
 * classroomId here is the MongoDB ObjectId
 */
export const manualTurnOff = async (req, res) => {
    try {
        const { classroomId } = req.params;

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ message: "Classroom not found" });
        }

        // Get current power
        const latestReading = await EnergyData.findOne({ classroomId: classroom._id })
            .sort({ timestamp: -1 })
            .select("power")
            .lean();
        const currentPower = latestReading?.power || 0;

        // Create automation log
        const log = await AutomationLog.create({
            classroomId: classroom._id,
            action: "MANUAL_OFF",
            reason: `Manual turn off — power was ${currentPower}W`,
            powerAtTime: currentPower,
            triggeredBy: "manual"
        });

        // Create alert for tracking
        await Alert.create({
            classroomId: classroom._id,
            type: "SCHEDULE_MISMATCH",
            severity: "LOW",
            message: `${classroom.classroomId} manually turned off — was using ${currentPower}W with no class scheduled`
        });

        console.log(`🔌 MANUAL-OFF: ${classroom.classroomId} triggered by admin`);

        res.status(201).json({
            message: `Turn-off command sent for ${classroom.classroomId}`,
            log
        });
    } catch (error) {
        console.error("Manual turnoff error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
