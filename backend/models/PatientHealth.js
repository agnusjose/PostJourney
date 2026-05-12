import mongoose from "mongoose";

const patientHealthSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Blood Pressure Records
    bpRecords: [{
        systolic: { type: Number, required: true },
        diastolic: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        notes: { type: String },
    }],

    // Blood Sugar Records
    sugarRecords: [{
        level: { type: Number, required: true },
        type: { type: String, enum: ["fasting", "postprandial", "random"], default: "random" },
        date: { type: Date, default: Date.now },
        notes: { type: String },
    }],

    // Cholesterol Records
    cholesterolRecords: [{
        level: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        notes: { type: String },
    }],

    // General health info
    diseaseHistory: { type: String, default: "" },
    allergies: { type: String, default: "" },
    currentMedications: { type: String, default: "" },
    notes: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("PatientHealth", patientHealthSchema);
