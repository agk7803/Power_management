import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusSettings" }
}, { timestamps: true });

export default mongoose.model("Department", DepartmentSchema);
