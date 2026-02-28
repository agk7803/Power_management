import * as aiService from "../services/ai.service.js";
import { explainAnomalies } from "../services/ai.explain.service.js";
import Alert from "../Models/Alert.js";
import EnergyData from "../Models/EnergyData.js";
import Timetable from "../Models/Timetable.js";

/**
 * Get anomaly analysis for a specific classroom
 * GET /api/ai/anomaly/:classroomId
 */
export const getAnomalyAnalysis = async (req, res) => {
    try {
        const { classroomId } = req.params;

        if (!classroomId) {
            return res.status(400).json({ message: "Classroom ID is required" });
        }

        const report = await aiService.detectClassroomAnomaly(classroomId);

        res.json(report);
    } catch (error) {
        console.error("AI Anomaly Analysis Error:", error);
        res.status(500).json({ message: "Error performing AI analysis" });
    }
};

/**
 * Explain anomalies in detail using OpenRouter AI
 * POST /api/ai/explain
 */
export const explainAnomaliesHandler = async (req, res) => {
    try {
        // Fetch the 10 most recent ANOMALY alerts (unacknowledged first)
        const alerts = await Alert.find({ type: "ANOMALY" })
            .sort({ acknowledged: 1, createdAt: -1 })
            .limit(10)
            .populate("classroomId")
            .lean();

        if (!alerts || alerts.length === 0) {
            return res.json({
                anomalyExplanations: [],
                optimizationSuggestions: [],
                overallAssessment: "No anomaly alerts found. The campus energy system is running within normal parameters. ✅"
            });
        }

        // Enrich each alert with energy data and timetable context
        const enrichedAlerts = await Promise.all(alerts.map(async (alert) => {
            // Get the energy data record linked to this alert
            let energyData = {};
            if (alert.energyDataId) {
                energyData = await EnergyData.findById(alert.energyDataId).lean() || {};
            }

            // Get timetable for this classroom
            let timetableSlots = [];
            if (alert.classroomId?._id) {
                timetableSlots = await Timetable.find({
                    classroomId: alert.classroomId._id
                }).lean();
            }

            return {
                severity: alert.severity,
                message: alert.message,
                createdAt: alert.createdAt,
                classroom: alert.classroomId || {},
                energyData,
                timetableSlots
            };
        }));

        // Call OpenRouter for detailed analysis
        const explanation = await explainAnomalies(enrichedAlerts);

        return res.json(explanation);
    } catch (error) {
        console.error("OpenRouter Explain Error:", error);

        if (error.message?.includes("OPENROUTER_API_KEY")) {
            return res.status(503).json({
                message: "OpenRouter API key not configured. Add OPENROUTER_API_KEY to your backend/.env file.",
                anomalyExplanations: [],
                optimizationSuggestions: [],
                overallAssessment: "AI explanation service is not configured."
            });
        }

        // Handle OpenRouter API errors gracefully
        if (error.status === 401 || error.status === 403 || error.message?.includes("OpenRouter API error")) {
            return res.status(503).json({
                message: "OpenRouter API Error: " + (error.message || "Invalid API Key or missing permissions."),
                anomalyExplanations: [],
                optimizationSuggestions: [],
                overallAssessment: "AI explanation failed due to an API key or credit issue."
            });
        }

        return res.status(500).json({
            message: "Error generating AI explanation: " + (error.message || "Internal Server Error"),
            anomalyExplanations: [],
            optimizationSuggestions: [],
            overallAssessment: "An error occurred while generating the AI analysis."
        });
    }
};
