/**
 * OpenRouter AI Service — Detailed Anomaly Explanation & Energy Optimization
 * Uses OpenRouter API to access high-quality LLMs like Gemini 2.5 Flash
 */

/**
 * Explain anomalies in detail and provide optimization suggestions
 * @param {Array} enrichedAlerts - Alerts with classroom, timetable, and energy context
 * @returns {Promise<Object>} Detailed explanations and optimization tips
 */
export const explainAnomalies = async (enrichedAlerts) => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set in environment variables");
    }

    // Build a rich prompt with all available context
    const alertSummaries = enrichedAlerts.map((a, i) => {
        const classroom = a.classroom || {};
        const timetable = a.timetableSlots || [];
        const energyData = a.energyData || {};

        const scheduleInfo = timetable.length > 0
            ? timetable.map(t => `  - ${t.dayOfWeek !== undefined ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][t.dayOfWeek] : "?"}: ${t.startTime}–${t.endTime} (${t.subject || "class"}, expected occupancy: ${t.expectedOccupancy})`).join("\n")
            : "  No timetable entries found (room may be unscheduled)";

        return `
ALERT #${i + 1}:
- Severity: ${a.severity}
- Message: ${a.message}
- Timestamp: ${new Date(a.createdAt).toLocaleString()}
- Classroom: ${classroom.name || "Unknown"} (ID: ${classroom.classroomId || "N/A"})
- Room Equipment: ${classroom.acCount || 0} ACs, ${classroom.fanCount || 0} fans, ${classroom.lightCount || 0} lights, projector: ${classroom.hasProjector ? "yes" : "no"}, capacity: ${classroom.capacity || "unknown"}
- Energy Reading: voltage=${energyData.voltage || "N/A"}V, current=${energyData.current || "N/A"}A, power=${energyData.power || "N/A"}W, energy=${energyData.energy || "N/A"}kWh
- Occupancy at time: ${energyData.metadata?.occupancy ?? "unknown"}, Scheduled class: ${energyData.metadata?.scheduledClass ?? "unknown"}
- Is Idle: ${energyData.isIdle ? "Yes" : "No"}
- Anomaly Score (z-score): ${energyData.anomalyScore || "N/A"}
- Room Schedule:
${scheduleInfo}`;
    }).join("\n\n");

    const prompt = `You are an expert energy management AI for a campus power monitoring system. Analyze the following anomaly alerts and provide detailed explanations.

For each anomaly, determine:
1. **Anomaly Type**: Is it a power spike, occupancy mismatch (high power + empty room), timetable conflict (power usage outside scheduled hours), equipment malfunction, idle waste, after-hours usage, or other?
2. **Root Cause Analysis**: Why is this reading anomalous? Reference the specific data values, compare with room equipment capacity, and check against the timetable schedule.
3. **Severity Assessment**: Is this a critical issue requiring immediate attention, or a pattern that needs monitoring?

Then provide specific energy optimization recommendations:
- How to reduce energy waste based on the detected patterns
- Equipment scheduling improvements
- Automation suggestions (auto-shutoff timers, occupancy sensors, etc.)
- Estimated energy savings potential

Here are the anomaly alerts with full context:
${alertSummaries}

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "anomalyExplanations": [
    {
      "alertIndex": 1,
      "anomalyType": "power_spike | occupancy_mismatch | timetable_conflict | equipment_malfunction | idle_waste | after_hours | other",
      "title": "Short descriptive title",
      "explanation": "Detailed 2-3 sentence explanation of what is happening and why it is anomalous",
      "rootCause": "Most likely root cause",
      "severityNote": "Why this severity level is appropriate",
      "affectedEquipment": ["AC", "Lights"],
      "icon": "⚡"
    }
  ],
  "optimizationSuggestions": [
    {
      "title": "Short actionable title",
      "description": "Detailed recommendation with specific steps",
      "priority": "HIGH | MEDIUM | LOW",
      "estimatedSavings": "e.g., ~2.5 kWh/day or ~15% reduction",
      "icon": "💡"
    }
  ],
  "overallAssessment": "A brief 2-3 sentence summary of the campus energy health based on these anomalies"
}`;

    // Note: Node 18+ has built in fetch so we don't need axios or node-fetch
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter
            "X-Title": "Campus Power Management", // Optional metadata
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            // switching to the free Llama 3 instruct model per recent guidance
            model: "meta-llama/llama-3-8b-instruct",
            messages: [
                { role: "user", content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.details = errorText;
        throw error;
    }

    const data = await response.json();
    let text = data?.choices?.[0]?.message?.content || "{}";

    // Parse the JSON response (Remove possible markdown fences just in case)
    let cleaned = text.trim();
    if (cleaned.startsWith("\`\`\`json")) {
        cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("\`\`\`")) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("\`\`\`")) {
        cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned);
    } catch (parseError) {
        console.error("Failed to parse OpenRouter response:", cleaned);
        return {
            anomalyExplanations: [{
                alertIndex: 1,
                anomalyType: "other",
                title: "AI Analysis Available",
                explanation: cleaned.slice(0, 500) + "...",
                rootCause: "See full explanation above",
                severityNote: "Review recommended",
                affectedEquipment: [],
                icon: "🤖"
            }],
            optimizationSuggestions: [],
            overallAssessment: "AI analysis completed — structured parsing unavailable. See explanation above."
        };
    }
};
