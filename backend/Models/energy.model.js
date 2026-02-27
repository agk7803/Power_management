import mongoose from "mongoose";

const energySchema = new mongoose.Schema({
  classroom: String,
  voltage: Number,
  current: Number,
  power: Number,
  energy: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Energy", energySchema);