import mongoose from "mongoose";

const AutomationLogSchema = new mongoose.Schema({
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
    action: {
        type: String,
        enum: ["AUTO_OFF", "MANUAL_OFF", "PRE_COOL"],
        required: true
    },
    reason: { type: String, default: "" },
    powerAtTime: { type: Number, default: 0 },
    triggeredBy: {
        type: String,
        enum: ["scheduler", "manual"],
        default: "scheduler"
    }
}, { timestamps: true });

AutomationLogSchema.index({ createdAt: -1 });
AutomationLogSchema.index({ classroomId: 1, createdAt: -1 });

export default mongoose.model("AutomationLog", AutomationLogSchema);
