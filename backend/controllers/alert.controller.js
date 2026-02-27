import Alert from "../Models/Alert.js";

export const getAlerts = async (req, res) => {
    try {
        const { acknowledged, type, limit = 50 } = req.query;

        const filter = {};
        if (acknowledged !== undefined) filter.acknowledged = acknowledged === "true";
        if (type) filter.type = type;

        const alerts = await Alert.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate("deviceId", "deviceId name")
            .populate("classroomId", "classroomId name");

        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const acknowledgeAlert = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { acknowledged: true, acknowledgedBy: req.user.id },
            { new: true }
        );
        if (!alert) return res.status(404).json({ message: "Alert not found" });
        res.json(alert);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
