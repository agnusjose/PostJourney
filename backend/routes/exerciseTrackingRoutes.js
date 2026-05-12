import express from "express";
import ExerciseSession from "../models/ExerciseSession.js";

const router = express.Router();

// ── Save completed exercise session ──────────────────────────────────────────
router.post("/exercise/save", async (req, res) => {
    try {
        const {
            patientId,
            exerciseName,
            repetitionsCompleted,
            durationSeconds,
            performanceLevel,
            date,
        } = req.body;

        if (!patientId || !exerciseName || repetitionsCompleted == null) {
            return res.json({ success: false, message: "patientId, exerciseName, and repetitionsCompleted are required" });
        }

        const session = new ExerciseSession({
            patientId,
            exerciseName,
            repetitionsCompleted,
            durationSeconds: durationSeconds || 0,
            performanceLevel: typeof performanceLevel === "number" ? performanceLevel : 0,
            date: date || new Date().toISOString().split("T")[0], // default to today
        });

        await session.save();
        console.log(`✅ Exercise saved: ${exerciseName} for patient ${patientId}`);
        return res.json({ success: true, message: "Exercise session saved", session });
    } catch (err) {
        console.error("❌ Save exercise error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ── Get today's exercises for a patient ──────────────────────────────────────
router.get("/exercise/daily/:patientId", async (req, res) => {
    try {
        const { patientId } = req.params;
        const today = new Date().toISOString().split("T")[0];

        const sessions = await ExerciseSession.find({
            patientId,
            date: today,
        }).sort({ timestamp: -1 });

        return res.json({ success: true, sessions });
    } catch (err) {
        console.error("❌ Get daily progress error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ── Get full exercise history for a patient ──────────────────────────────────
router.get("/exercise/history/:patientId", async (req, res) => {
    try {
        const { patientId } = req.params;

        const sessions = await ExerciseSession.find({ patientId })
            .sort({ timestamp: -1 })
            .limit(200);

        return res.json({ success: true, sessions });
    } catch (err) {
        console.error("❌ Get history error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ── Get exercise summary: daily / weekly / monthly aggregation ───────────────
router.get("/exercise/summary/:patientId", async (req, res) => {
    try {
        const { patientId } = req.params;
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split("T")[0];

        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthAgoStr = monthAgo.toISOString().split("T")[0];

        const sessions = await ExerciseSession.find({
            patientId,
            date: { $gte: monthAgoStr },
        }).sort({ timestamp: -1 });

        // Group by exercise name and aggregate
        const exerciseMap = {};
        sessions.forEach(s => {
            if (!exerciseMap[s.exerciseName]) {
                exerciseMap[s.exerciseName] = { daily: 0, weekly: 0, monthly: 0, sessions: [] };
            }
            const entry = exerciseMap[s.exerciseName];
            const reps = s.repetitionsCompleted || 0;

            if (s.date === todayStr) entry.daily += reps;
            if (s.date >= weekAgoStr) entry.weekly += reps;
            entry.monthly += reps;
            entry.sessions.push({ date: s.date, reps, duration: s.durationSeconds || 0 });
        });

        return res.json({ success: true, summary: exerciseMap });
    } catch (err) {
        console.error("❌ Get exercise summary error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

export default router;
