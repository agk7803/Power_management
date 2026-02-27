import mongoose from "mongoose";

const CampusSettingsSchema = new mongoose.Schema({
    campusName: { type: String, required: true },
    electricityTariff: { type: Number, required: true },   // ₹ per kWh
    co2Factor: { type: Number, required: true },            // kg CO₂ per kWh
    workingHours: {
        start: { type: String, default: "09:00" },            // HH:mm
        end: { type: String, default: "17:00" }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("CampusSettings", CampusSettingsSchema);
