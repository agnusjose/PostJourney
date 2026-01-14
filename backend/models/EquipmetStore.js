import mongoose from "mongoose";

const equipmentStoreSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    providerName: String,
    providerEmail: String,

    equipmentName: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    pricePerDay: {
      type: Number,
      required: true,
    },

    description: String,

    imageUrl: String,

    // ✅ NEW FIELD
    stock: {
      type: Number,
      required: true,
      min: 0,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "EquipmentStore",
  equipmentStoreSchema,
  "equipmentstores"
);