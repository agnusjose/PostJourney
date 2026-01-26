import express from "express";
import Doctor from "../models/Doctor.js";
import Consultation from "../models/Consultation.js";

const router = express.Router();


// 🔹 Get all doctors
router.get("/doctors", async (req, res) => {
    try {
        const doctors = await Doctor.find();
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 🔹 Book consultation + simulate payment
router.post("/book-consultation", async (req, res) => {
    try {
        const { patientId, patientName, doctorId, problem, date } = req.body;
        console.log("🔍 Book Consultation Request Body:", req.body);

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ error: "Doctor not found" });

        // 💳 Payment simulation
        const totalFee = doctor.fee;
        const adminFee = totalFee * 0.2; // 20% admin commission
        const doctorFee = totalFee - adminFee;

        const consultation = new Consultation({
            patientId,
            patientName,
            doctorId,
            doctorName: doctor.name,
            problemDescription: problem,
            consultationDate: date,
            totalFee,
            adminCommission: adminFee,
            doctorShare: doctorFee,
            paymentStatus: "Success"
        });

        console.log("📝 Creating Consultation:", consultation);

        await consultation.save();

        res.json({ message: "Consultation booked successfully!" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;