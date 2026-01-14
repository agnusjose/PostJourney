import express from "express";
import EquipmentStore from "../models/EquipmentStore.js";
import User from "../models/User.js";
import { uploadEquipmentImage } from "../utils/uploadEquipmentImage.js";

const router = express.Router();

/* =========================
   ADD EQUIPMENT (PROVIDER)
========================= */
router.post(
  "/add",
  uploadEquipmentImage.single("image"),
  async (req, res) => {
    try {
      const {
        providerId,
        equipmentName,
        category,
        pricePerDay,
        description,
        stock,
      } = req.body;

      if (
        !providerId ||
        !equipmentName ||
        !category ||
        !pricePerDay ||
        stock === undefined
      ) {
        return res.json({ success: false, message: "Missing fields" });
      }

      const provider = await User.findById(providerId);
      if (!provider) {
        return res.json({ success: false, message: "Invalid provider" });
      }

      const equipment = new EquipmentStore({
        providerId,
        providerName: provider.name,
        providerEmail: provider.email,
        equipmentName,
        category,
        pricePerDay: Number(pricePerDay),
        description,
        stock: Number(stock),
        isAvailable: Number(stock) > 0,
        imageUrl: req.file
          ? `/uploads/equipment/${providerId}/${req.file.filename}`
          : null,
      });

      await equipment.save();

      res.json({ success: true, equipment });
    } catch (err) {
      console.error(err);
      res.json({ success: false, message: "Server error" });
    }
  }
);

/* =========================
   PROVIDER EQUIPMENT LIST
========================= */
router.get("/provider/:providerId", async (req, res) => {
  try {
    const equipment = await EquipmentStore.find({
      providerId: req.params.providerId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, equipment });
  } catch {
    res.json({ success: false, message: "Fetch failed" });
  }
});

/* =========================
   🔴 PATIENT EQUIPMENT LIST
   🔴 THIS WAS MISSING
========================= */
router.get("/all", async (req, res) => {
  try {
    const equipment = await EquipmentStore.find({
      isBlocked: false,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      equipment,
    });
  } catch (err) {
    console.error("Patient equipment fetch error:", err);
    res.json({
      success: false,
      message: "Failed to fetch equipment",
    });
  }
});

export default router;