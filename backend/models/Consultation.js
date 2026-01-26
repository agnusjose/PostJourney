import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true,
    },
    patientName: {
        type: String,
        required: true
    },
    doctorName: {
        type: String,
        required: true
    },
    problemDescription: {
        type: String,
        required: true,
    },
    consultationDate: {
        type: Date,
        required: true,
    },
    totalFee: {
        type: Number,
        required: true,
    },
    adminCommission: {
        type: Number,
        required: true,
    },
    doctorShare: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "completed", "cancelled"],
        default: "pending",
    },
    paymentStatus: {
        type: String,
        default: "Success", // Simulated payment
    }
}, { timestamps: true });

const Consultation = mongoose.model("Consultation", consultationSchema);
export default Consultation;