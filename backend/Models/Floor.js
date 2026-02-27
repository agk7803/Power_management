import mongoose from "mongoose";

const FloorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    floorNumber: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model("Floor", FloorSchema);
