import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    userType: {
      type: String,
      enum: ["patient", "service provider", "admin"],
      required: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    // Email / OTP verification
    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: String,
    otpExpiry: Date,
    otpLastSentAt: Date,

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    // ✅ NEW (ADMIN-CONTROLLED – SERVICE PROVIDERS ONLY)
    providerVerification: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      documentUrl: String, // Aadhaar / License / ID (later)
      reviewedByAdminAt: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
