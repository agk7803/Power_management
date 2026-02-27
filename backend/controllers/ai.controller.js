import * as aiService from "../services/ai.service.js";

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
