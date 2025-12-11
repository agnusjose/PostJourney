import express from "express";
import Video from "../models/Video.js";

const router = express.Router();

// Add new video
router.post("/add", async (req, res) => {
  try {
    const { title, description, url, category } = req.body;

    // Extract YouTube ID
    let id = "";
    if (url.includes("v=")) {
      id = url.split("v=")[1];
    } else if (url.includes("youtu.be")) {
      id = url.split("youtu.be/")[1];
    }

    const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

    const video = new Video({ title, description, url, thumbnail, category });
    await video.save();

    res.json({ success: true, video });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error adding video" });
  }
});

// Get all videos
router.get("/", async (req, res) => {
  try {
    const videos = await Video.find();
    res.json({ success: true, videos });
  } catch (err) {
    res.json({ success: false, message: "Error fetching videos" });
  }
});

// Get videos by category
router.get("/:category", async (req, res) => {
  try {
    const videos = await Video.find({ category: req.params.category });
    res.json({ success: true, videos });
  } catch (err) {
    res.json({ success: false, message: "Error fetching category videos" });
  }
});

export default router;
