import mongoose from "mongoose";

const exercisePrescriptionSchema = new mongoose.Schema({
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    exercises: [{
        exerciseKey: { type: String, required: true },    // e.g. "MARCHING_IN_PLACE"
        exerciseName: { type: String, required: true },   // e.g. "Marching in Place"
        targetReps: { type: Number, required: true, default: 10 },
        frequency: { type: String, default: "daily" },
    }],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Index for fast patient lookups
exercisePrescriptionSchema.index({ patientId: 1, isActive: 1 });
exercisePrescriptionSchema.index({ consultationId: 1 });

const ExercisePrescription = mongoose.model("ExercisePrescription", exercisePrescriptionSchema);
export default ExercisePrescription;
