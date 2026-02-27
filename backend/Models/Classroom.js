import mongoose from "mongoose";

const ClassroomSchema = new mongoose.Schema({
    classroomId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    floorId: { type: mongoose.Schema.Types.ObjectId, ref: "Floor" },
    capacity: { type: Number, default: 0 },
    acCount: { type: Number, default: 0 },
    fanCount: { type: Number, default: 0 },
    lightCount: { type: Number, default: 0 },
    hasProjector: { type: Boolean, default: false },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Device", default: null }
}, { timestamps: true });

export default mongoose.model("Classroom", ClassroomSchema);
