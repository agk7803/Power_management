export const explainAnomalies = async (enrichedAlerts) => {

    const alertSummaries = enrichedAlerts.slice(0, 1).map((a, i) => {
        const classroom = a.classroom || {};
        const energyData = a.energyData || {};

        return `
ALERT #${i + 1}
Severity: ${a.severity}
Message: ${a.message}
Room: ${classroom.name || "Unknown"}
Power: ${energyData.power || "N/A"}W
Occupancy: ${energyData.metadata?.occupancy ?? "unknown"}
Idle: ${energyData.isIdle ? "Yes" : "No"}
Z-Score: ${energyData.anomalyScore || "N/A"}
`;
    }).join("\n");

    const prompt = `
You are an energy management AI.

Analyze the anomaly below and explain:

- What type of anomaly it is
- Why it likely occurred
- How severe it is

Respond ONLY in valid JSON format:

{
  "anomalyExplanations": [
    {
      "title": "string",
      "explanation": "2-3 sentence explanation",
      "rootCause": "string",
      "severityNote": "string"
    }
  ]
}

Anomaly Data:
${alertSummaries}
`;

    const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "llama3", // faster quantized model
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.2,
                num_predict: 300   // limit output size (VERY IMPORTANT)
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Local AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data?.response || "{}";

    try {
        return JSON.parse(text);
    } catch {
        return {
            anomalyExplanations: [{
                alertIndex: 1,
                anomalyType: "other",
                title: "AI Analysis",
                explanation: text.slice(0, 500),
                rootCause: "See explanation above",
                severityNote: "Review recommended"
            }]
        };
    }
};