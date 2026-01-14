import mongoose from "mongoose";

const equipmentSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: { type: String, required: true },
    description: String,
    pricePerDay: Number,
    available: { type: Boolean, default: true },

    images: [String], // file paths

  },
  { timestamps: true }
);

export default mongoose.model("Equipment", equipmentSchema);