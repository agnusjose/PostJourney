import mongoose from "mongoose";

const healthReadingSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  heartRate: { type: Number, default: 0 },
  spo2: { type: Number, default: 0 },
  ax: { type: Number, default: 0 },
  ay: { type: Number, default: 0 },
  az: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

// Auto-delete readings older than 24 hours
healthReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model("HealthReading", healthReadingSchema);
