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
        console.error("Local AI Explain Error:", error);

        // Handle Ollama connection errors cleanly
        if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
            return res.status(503).json({
                message: "Cannot connect to Local AI. Please ensure Ollama is installed and running in the background (http://localhost:11434).",
                anomalyExplanations: [],
                optimizationSuggestions: [],
                overallAssessment: "Local AI service is unreachable."
            });
        }

        // Handle Ollama API errors gracefully
        if (error.status === 404 || error.message?.includes("Local AI API error")) {
            return res.status(503).json({
                message: "Local AI API Error: " + (error.message || "Model not found. Try running 'ollama run llama3' in your terminal."),
                anomalyExplanations: [],
                optimizationSuggestions: [],
                overallAssessment: "AI explanation failed due to model availability."
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
