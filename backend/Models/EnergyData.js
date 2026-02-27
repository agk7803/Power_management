import mongoose from "mongoose";

const EnergyDataSchema = new mongoose.Schema({

    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
    timestamp: { type: Date, default: Date.now, index: true },
    voltage: { type: Number, default: 230 },
    current: { type: Number, default: 0 },
    power: { type: Number, required: true },       // watts
    energy: { type: Number, required: true },       // kWh (from ESP32)
    cost: { type: Number, default: 0 },             // calculated server-side
    co2: { type: Number, default: 0 },              // calculated server-side
    isAnomaly: { type: Boolean, default: false },
    isIdle: { type: Boolean, default: false },
    anomalyScore: { type: Number, default: 0 },
    metadata: {
        occupancy: { type: Number, default: 0 },
        scheduledClass: { type: Boolean, default: false }
    }
});

// Compound indexes for time-series queries

EnergyDataSchema.index({ classroomId: 1, timestamp: -1 });
export default mongoose.model("EnergyData", EnergyDataSchema);