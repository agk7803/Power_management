import mongoose from "mongoose";

const DeviceSchema = new mongoose.Schema({
    deviceId: { type: String, unique: true, required: true },   // ESP32 MAC address
    name: { type: String, default: "" },
    floorId: { type: mongoose.Schema.Types.ObjectId, ref: "Floor", default: null },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", default: null },
    status: {
        type: String,
        enum: ["REGISTERED", "ACTIVE", "OFFLINE", "DECOMMISSIONED"],
        default: "REGISTERED"
    },
    firmwareVersion: { type: String, default: "1.0.0" },
    lastSeen: { type: Date, default: null },
    activatedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("Device", DeviceSchema);
