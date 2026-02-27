import mongoose from "mongoose";

const TimetableSchema = new mongoose.Schema({
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },   // 0=Sunday
    startTime: { type: String, required: true },                     // "HH:mm"
    endTime: { type: String, required: true },                       // "HH:mm"
    subject: { type: String, default: "" },
    faculty: { type: String, default: "" },
    expectedOccupancy: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Timetable", TimetableSchema);
