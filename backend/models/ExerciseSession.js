import mongoose from "mongoose";

const exerciseSessionSchema = new mongoose.Schema({
    patientId: { type: String, required: true, index: true },
    exerciseName: { type: String, required: true },
    repetitionsCompleted: { type: Number, required: true },
    durationSeconds: { type: Number, default: 0 },
    performanceLevel: { type: Number, default: 0 }, // 0-100 approximate range / quality
    date: { type: String, required: true }, // YYYY-MM-DD
    timestamp: { type: Date, default: Date.now },
});

// Compound index for fast daily lookups
exerciseSessionSchema.index({ patientId: 1, date: 1 });

const ExerciseSession = mongoose.model("ExerciseSession", exerciseSessionSchema);
export default ExerciseSession;
