import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },

    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true 
    },

    password: { 
      type: String, 
      required: true 
    },

    userType: {
      type: String,
      enum: ["patient", "service-provider", "admin","service provider"], // CHANGED: "service provider" to "service-provider"
      required: true,
    },

    // ========== NEW FIELDS FOR MARKETPLACE ==========
    // For Patients
    age: {
      type: Number,
      default: null
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: ""
    },
    phoneNumber: {
      type: String,
      default: ""
    },
    address: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    primaryCondition: {
      type: String,
      default: ""
    },
    
    // For Service Providers
    agencyName: {
      type: String,
      default: ""
    },
    serviceType: {
      type: String,
      default: ""
    },
    licenseNumber: {
      type: String,
      default: ""
    },
    // ========== END NEW FIELDS ==========

    // ✅ KEEPING YOUR EXISTING FIELDS
    isBlocked: {
      type: Boolean,
      default: false,
    },

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

    // ✅ UPDATED providerVerification (keeping your structure, adding more fields)
    providerVerification: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", ""],
        default: ""
      },
      documentUrl: String, // Aadhaar / License / ID (keeping your field)
      // ✅ NEW: Adding more details for better tracking
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      verifiedAt: {
        type: Date
      },
      rejectionReason: {
        type: String,
        default: ""
      },
      reviewedByAdminAt: Date, // Keeping your field
    },
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model("User", userSchema);