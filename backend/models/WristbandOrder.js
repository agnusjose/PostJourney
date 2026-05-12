import mongoose from "mongoose";

const wristbandOrderSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    default: 500
  },
  totalAmount: {
    type: Number,
    required: true
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
  status: {
    type: String,
    enum: ["pending", "confirmed", "shipped", "out-for-delivery", "delivered", "cancelled"],
    default: "pending"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "refunded"],
    default: "pending"
  },
  paymentMethod: {
    type: String,
    enum: ["pending", "upi", "card", "netbanking", "wallet", "cod"],
    default: "pending"
  },
  trackingInfo: {
    trackingNumber: { type: String, default: "" },
    shippedAt: { type: Date },
    outForDeliveryAt: { type: Date },
    deliveredAt: { type: Date }
  },
  cancelledBy: {
    type: String,
    enum: ["patient", "admin", "system", ""],
    default: ""
  },
  cancellationReason: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

// Calculate total amount before saving
wristbandOrderSchema.pre("save", function (next) {
  this.totalAmount = this.unitPrice * this.quantity;
  next();
});

const WristbandOrder = mongoose.model("WristbandOrder", wristbandOrderSchema);
export default WristbandOrder;
