import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["consultation_reminder", "general", "wristband_order", "wristband_payment", "wristband_status", "wristband_cancelled"], default: "general" },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation" },
    read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);
