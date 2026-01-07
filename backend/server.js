import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendOtpMail } from "./utils/sendOtpMail.js";
import User from "./models/User.js";
import equipmentRoutes from "./routes/equipmentRoutes.js"; 

// ✅ LOAD ENV F
// IRST — THIS IS THE FIX
dotenv.config();


console.log("ENV FILE CHECK");
console.log("YouTube API Key:", process.env.YOUTUBE_API_KEY);

// App init
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",  // Web app (Vite)
      "http://localhost:8081",  // Expo web
      "http://192.168.8.135:5000", // Backend (self-reference)
      "http://192.168.112.170",  // Mobile app device
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema


// Validation regex
const nameRegex = /^[A-Za-z\s]+$/;
const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

const allowedDomains = ["gmail.com", "yahoo.com", "outlook.com"];

// Register
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, userType } = req.body;

    if (!name || !email || !password || !userType)
      return res.json({ success: false, message: "All fields are required." });

    if (!nameRegex.test(name))
      return res.json({
        success: false,
        message: "Name should contain only letters.",
      });

    if (!emailRegex.test(email))
      return res.json({
        success: false,
        message: "Invalid email format.",
      });

    const domain = email.split("@")[1];
    if (!allowedDomains.includes(domain))
      return res.json({
        success: false,
        message: "Email domain not allowed.",
      });

    if (!passwordRegex.test(password))
      return res.json({
        success: false,
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });

    if (!["patient", "service provider"].includes(userType))
      return res.json({
        success: false,
        message: "User type must be either patient or service provider.",
      });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.json({
        success: false,
        message: "Email already registered.",
      });

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔢 Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // ⏳ OTP expiry (10 minutes)
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      userType,
      isVerified: false,
      otp,
      otpExpiry,
    });

    await user.save();

    // 📧 Send OTP
    await sendOtpMail(email, otp);

    return res.json({
      success: true,
      message: "OTP sent to your email. Please verify.",
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error occurred." });
  }
});


app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email });
    console.log("OTP Entered:", otp);
console.log("OTP Stored:", user.otp);
console.log("OTP Expiry in DB:", user.otpExpiry);
console.log("Current Server Time:", new Date());

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.json({
        success: true,
        message: "Email already verified",
      });
    }

    // ⏳ OTP expiry check (10 minutes)
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.json({
        success: false,
        message: "OTP expired. Please resend OTP",
      });
    }

    // 🔢 OTP match check
    if (user.otp !== otp) {
      return res.json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ✅ SUCCESS
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Server error",
    });
  }
});


app.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.json({
        success: false,
        message: "Email already verified",
      });
    }

    // ⏱️ Enforce 40-second cooldown
    if (user.otpLastSentAt) {
      const secondsPassed =
        (Date.now() - user.otpLastSentAt.getTime()) / 1000;

      if (secondsPassed < 40) {
        return res.json({
          success: false,
          message: `Please wait ${Math.ceil(
            40 - secondsPassed
          )} seconds before resending OTP`,
        });
      }
    }

    // 🔢 Generate new OTP
    const newOtp = crypto.randomInt(100000, 999999).toString();

    // ⏳ New expiry (10 minutes)
    const newExpiry = new Date();
    newExpiry.setMinutes(newExpiry.getMinutes() + 10);

    // Save updates
    user.otp = newOtp;
    user.otpExpiry = newExpiry;
    user.otpLastSentAt = new Date();

    await user.save();

    // 📧 Send email
    await sendOtpMail(email, newOtp);

    return res.json({
      success: true,
      message: "New OTP sent to your email",
    });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Server error",
    });
  }
});



// Login
app.post("/login", async (req, res) => {
  console.log("🔥 NEW LOGIN ROUTE HIT 🔥");

  try {
    const { email, password } = req.body;

    // 1️⃣ Check empty fields
    if (!email || !password) {
      return res.json({
        success: false,
        message: "All fields are required",
      });
    }

    // 2️⃣ Check user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: "User does not exist",
      });
    }

    // 3️⃣ Check if blocked by admin
    if (user.isBlocked) {
      return res.json({
        success: false,
        message: "Your account has been blocked by admin",
      });
    }

    // 4️⃣ Check email verification
    if (!user.isVerified) {
      return res.json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    // 5️⃣ Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ SUCCESS
    return res.json({
  success: true,
  message: "Login successful",
  userType: user.userType,
  name: user.name,
  email: user.email,
  profileCompleted: user.profileCompleted,
});

  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Server error occurred",
    });
  }
});

app.put("/service-provider/complete-profile", async (req, res) => {
  const { email, serviceName, phone } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    return res.json({ success: false, message: "User not found" });

  user.profileCompleted = true;

  // optional: save provider-specific data later in another collection
  await user.save();

  res.json({ success: true });
});



// Routes
import videoRoutes from "./routes/videoRoutes.js";
import youtubeRoutes from "./routes/youtubeRoutes.js";

app.use("/api", videoRoutes);
app.use("/api/youtube", youtubeRoutes);

// Admin login
app.post("/admin/login", async (req, res) => {
  const { secretKey, email, password } = req.body;

  if (secretKey !== "POSTJOURNEY2024")
    return res.json({ success: false, message: "Invalid Secret Key" });

  const admin = await User.findOne({ email, userType: "admin" });
  if (!admin)
    return res.json({ success: false, message: "Admin not found" });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch)
    return res.json({ success: false, message: "Wrong password" });

  res.json({ success: true, message: "Admin Login Successful" });
});

// Admin utilities
app.get("/admin/test", (req, res) => res.send("Admin route OK"));

app.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch {
    res.json({ success: false, message: "Failed to fetch users" });
  }
});

app.put("/admin/block/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.json({ success: false, message: "User not found" });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ success: true, isBlocked: user.isBlocked });
  } catch {
    res.json({ success: false, message: "Failed to update user" });
  }
});

app.delete("/admin/delete/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.json({ success: false, message: "Failed to delete user" });
  }
});
// Server start
app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000 (LAN enabled)");
});

// ✅ Register Equipment Routes
app.use("/api/equipments", equipmentRoutes);