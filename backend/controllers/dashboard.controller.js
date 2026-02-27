// backend/controllers/dashboard.controller.js

import EnergyData from "../Models/EnergyData.js";
import Device from "../Models/Device.js";
import Alert from "../Models/Alert.js";
import Classroom from "../Models/Classroom.js";
import Timetable from "../Models/Timetable.js";
import CampusSettings from "../Models/CampusSettings.js";

export const getDashboardData = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

        // Total energy today
        const energyAgg = await EnergyData.aggregate([
            { $match: { timestamp: { $gte: todayStart } } },
            { $group: { _id: null, totalEnergy: { $sum: "$energy" }, totalCost: { $sum: "$cost" }, totalCO2: { $sum: "$co2" } } }
        ]);

        const totals = energyAgg[0] || { totalEnergy: 0, totalCost: 0, totalCO2: 0 };

        // Active devices count
        const activeDevices = await Device.countDocuments({ status: "ACTIVE" });
        const totalDevices = await Device.countDocuments();

        // Total live campus power + active rooms — from latest energy readings (last 5 min)
        const latestPerRoom = await EnergyData.aggregate([
            { $match: { timestamp: { $gte: fiveMinAgo } } },
            { $sort: { timestamp: -1 } },
            { $group: { _id: "$classroomId", latestPower: { $first: "$power" } } }
        ]);
        const totalPower = Math.round(latestPerRoom.reduce((sum, r) => sum + (r.latestPower || 0), 0));
        const activeRooms = latestPerRoom.length;

        // Recent alerts
        const alerts = await Alert.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("classroomId", "classroomId name")
            .lean();

        // Anomaly count today
        const anomaliesToday = await EnergyData.countDocuments({
            timestamp: { $gte: todayStart },
            isAnomaly: true
        });

        res.status(200).json({
            totalPower,
            energyToday: `${totals.totalEnergy.toFixed(2)} kWh`,
            costToday: `₹${totals.totalCost.toFixed(2)}`,
            co2Today: `${totals.totalCO2.toFixed(3)} kg`,
            activeDevices,
            totalDevices,
            activeRooms,
            anomaliesToday,
            alerts: alerts.map(a => ({
                type: a.severity === "CRITICAL" || a.severity === "HIGH" ? "warning" : a.type === "IDLE" ? "info" : "success",
                title: a.message,
                time: a.createdAt,
                severity: a.severity,
                alertType: a.type,
                classroom: a.classroomId?.name || "Unknown"
            }))
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Hourly power trend for today
export const getHourlyTrend = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const hourly = await EnergyData.aggregate([
            { $match: { timestamp: { $gte: todayStart } } },
            {
                $group: {
                    _id: { $hour: "$timestamp" },
                    avgPower: { $avg: "$power" },
                    totalEnergy: { $sum: "$energy" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill all 24 hours
        const result = Array.from({ length: 24 }, (_, i) => {
            const found = hourly.find(h => h._id === i);
            return {
                hour: i,
                avgPower: found ? Math.round(found.avgPower) : 0,
                totalEnergy: found ? parseFloat(found.totalEnergy.toFixed(4)) : 0
            };
        });

        res.json(result);
    } catch (error) {
        console.error("Hourly trend error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
