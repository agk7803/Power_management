import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema({
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Device" },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
    type: {
        type: String,
        enum: ["ANOMALY", "IDLE", "OFFLINE", "SCHEDULE_MISMATCH"],
        required: true
    },
    severity: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        default: "MEDIUM"
    },
    message: { type: String, required: true },
    energyDataId: { type: mongoose.Schema.Types.ObjectId, ref: "EnergyData" },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ acknowledged: 1 });

export default mongoose.model("Alert", AlertSchema);
