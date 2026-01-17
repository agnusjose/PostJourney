import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Equipment",
    required: true
  },
  equipmentName: {
    type: String,
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  providerName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "in-progress", "completed", "cancelled"],
    default: "pending"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "refunded"],
    default: "pending"
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ""
  },
  cancelledBy: {
    type: String,
    enum: ["patient", "provider", "system", ""],
    default: ""
  },
  cancellationReason: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

// Calculate total days and amount before saving
bookingSchema.pre("save", function(next) {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const timeDiff = Math.abs(end - start);
  this.totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  this.totalAmount = this.totalDays * this.pricePerDay;
  next();
});

// ✅ FIX: Export as default
const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;  // Make sure this line exists