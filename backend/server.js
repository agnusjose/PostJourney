import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendOtpMail } from "./utils/sendOtpMail.js";
import User from "./models/User.js";

// ✅ LOAD ENV F
import equipmentRoutes from "./routes/equipmentRoutes.js";
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
  console.log("=== OTP VERIFICATION REQUEST ===");
  console.log("Request body:", req.body);
  console.log("Request time:", new Date().toISOString());
  
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      console.log("Missing email or OTP");
      return res.json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    console.log("Looking for user with email:", email);
    
    // Check database connection first
    const dbStatus = mongoose.connection.readyState;
    console.log("Database connection status:", dbStatus);
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log("User not found in database");
      return res.json({
        success: false,
        message: "User not found. Please check your email.",
      });
    }

    console.log("User found:", {
      email: user.email,
      isVerified: user.isVerified,
      otp: user.otp,
      otpExpiry: user.otpExpiry,
      otpExpiryType: typeof user.otpExpiry,
      currentTime: new Date()
    });

    if (user.isVerified) {
      console.log("User already verified");
      return res.json({
        success: true,
        message: "Email already verified",
      });
    }

    // Check if OTP exists
    if (!user.otp) {
      console.log("No OTP found for user");
      return res.json({
        success: false,
        message: "No OTP found. Please request a new OTP.",
      });
    }

    // ⏳ OTP expiry check
    if (!user.otpExpiry) {
      console.log("No OTP expiry time set");
      return res.json({
        success: false,
        message: "OTP expired. Please resend OTP",
      });
    }

    const currentTime = new Date();
    const expiryTime = new Date(user.otpExpiry);
    
    console.log("OTP Expiry Check:");
    console.log("Current time:", currentTime);
    console.log("OTP expiry:", expiryTime);
    console.log("Is OTP expired?", currentTime > expiryTime);

    if (currentTime > expiryTime) {
      console.log("OTP has expired");
      return res.json({
        success: false,
        message: "OTP expired. Please resend OTP",
      });
    }

    // 🔢 OTP match check
    console.log("OTP Comparison:");
    console.log("Entered OTP:", otp);
    console.log("Stored OTP:", user.otp);
    console.log("OTP match?", user.otp === otp);

    if (user.otp !== otp) {
      console.log("OTP doesn't match");
      return res.json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ✅ SUCCESS
    console.log("OTP verification successful!");
    
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    
    await user.save();
    
    console.log("User updated successfully");

    return res.json({
      success: true,
      message: "Email verified successfully",
    });
    
  } catch (err) {
    console.error("=== SERVER ERROR IN VERIFY-OTP ===");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    // Check for specific MongoDB errors
    if (err.name === 'MongoError' || err.name === 'MongooseError') {
      console.error("MongoDB/Mongoose error:", err);
    }
    
    return res.json({
      success: false,
      message: "Server error: " + err.message,
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



// ========== FIXED LOGIN ROUTE - MATCHES REACT NATIVE EXPECTATIONS ==========
app.post("/login", async (req, res) => {
  console.log("🔥 LOGIN ROUTE HIT");
  console.log("Login attempt for:", req.body.email);

  try {
    const { email, password } = req.body;

    // 1️⃣ Check empty fields
    if (!email || !password) {
      return res.json({
        success: false,
        message: "All fields are required",
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // 2️⃣ Check user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log("❌ User not found:", normalizedEmail);
      return res.json({
        success: false,
        message: "User does not exist",
      });
    }

    console.log("✅ User found:", user.email, "Type:", user.userType);

    // 3️⃣ Check if blocked by admin
    if (user.isBlocked) {
      console.log("❌ User is blocked");
      return res.json({
        success: false,
        message: "Your account has been blocked by admin",
      });
    }

    // 4️⃣ Check email verification
    if (!user.isVerified) {
      console.log("❌ Email not verified");
      return res.json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    // 5️⃣ Check provider verification status (ONLY for service providers)
    if (user.userType === "service provider") {
      const verificationStatus = user.providerVerification?.status;
      console.log("Provider verification status:", verificationStatus);
      
      // If status is "rejected" - user cannot login
      if (verificationStatus === "rejected") {
        return res.json({
          success: false,
          message: "Your provider application has been rejected. Please contact admin.",
        });
      }
      
      // If status is "pending" or doesn't exist - user cannot login
      if (!verificationStatus || verificationStatus === "pending") {
        return res.json({
          success: false,
          message: "Your provider account is pending admin approval. You will be notified once approved.",
        });
      }
      
      // Only allow login if status is EXACTLY "approved"
      if (verificationStatus !== "approved") {
        return res.json({
          success: false,
          message: "Account verification required. Please contact admin.",
        });
      }
    }

    // 6️⃣ Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("✅ Login successful for:", user.email);

    // ✅ SUCCESS - Return EXACTLY what your React Native app expects
   // In server.js login endpoint
return res.json({
  success: true,
  message: "Login successful",
  userType: user.userType,
  name: user.name,
  email: user.email,
 userId: user._id.toString(), // ADD THIS LINE - convert ObjectId to string 
   profileCompleted: user.profileCompleted || false,
});

  } catch (err) {
    console.error("❌ Login error:", err);
    return res.json({
      success: false,
      message: "Server error occurred",
    });
  }
});


// Simple profile completion endpoints - add to your server.js

// Service Provider Profile Completion
app.post("/api/service-provider/complete-profile", async (req, res) => {
  try {
    const { email, agencyName, serviceType, phoneNumber, city } = req.body;

    if (!email || !agencyName || !phoneNumber || !city) {
      return res.json({
        success: false,
        message: "All fields are required",
      });
    }

    // Update user profile completion status
    const user = await User.findOneAndUpdate(
      { email },
      { 
        profileCompleted: true,
        userType: "service-provider"
      },
      { new: true }
    );

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    // You can save additional details in a separate collection if needed
    // For now, just mark profile as completed

    return res.json({
      success: true,
      message: "Profile completed successfully",
    });

  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Server error",
    });
  }
});

// Patient Profile Completion
app.post("/api/patient/complete-profile", async (req, res) => {
  try {
    const { email, fullName, age, gender, phoneNumber, city, primaryCondition } = req.body;

    if (!email || !fullName || !age || !phoneNumber || !city || !primaryCondition) {
      return res.json({
        success: false,
        message: "All fields are required",
      });
    }

    // Update user profile completion status
    const user = await User.findOneAndUpdate(
      { email },
      { 
        profileCompleted: true,
        userType: "patient"
      },
      { new: true }
    );

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "Profile completed successfully",
    });

  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Server error",
    });
  }
});



// Routes
import videoRoutes from "./routes/videoRoutes.js";
import youtubeRoutes from "./routes/youtubeRoutes.js";

app.use("/api", videoRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/equipment", equipmentRoutes);


// ==========================================
// SECTION 4: ADMIN ROUTES (FROM SECOND WORKING CODE)
// ==========================================
import adminRoutes from "./routes/admin.routes.js";
// Admin login - FROM SECOND CODE
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

// Admin utilities - FROM FIRST CODE (for backward compatibility)
app.get("/admin/test", (req, res) => res.json({ message: "Admin route OK" }));

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

// ==========================================
// SECTION 5: ADMIN ROUTES MODULE
// ==========================================

console.log("📌 Mounting admin routes module...");
app.use("/admin", adminRoutes);

// ==========================================
// SECTION 6: FALLBACK ROUTE
// ==========================================

app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: "Route not found",
    requested: `${req.method} ${req.url}`,
    availableRoutes: [
      "GET /", 
      "GET /test", 
      "POST /register", 
      "POST /verify-otp", 
      "POST /resend-otp", 
      "POST /login",
      "POST /admin/login",
      "GET /admin/test",
      "GET /admin/users"
    ]
  });
});

// Start server
app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000 (LAN enabled)");
});

