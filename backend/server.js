import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { sendOtpMail } from "./utils/sendOtpMail.js";
import User from "./models/User.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import Equipment from "./models/Equipment.js";
import Booking from "./models/Booking.js";
import multer from "multer";
import fs from "fs";

// ? LOAD ENV
dotenv.config();

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App init
const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:8081",
    "http://192.168.115.72:5000",
    "http://192.168.112.170",
    "http://192.168.8.135:5000",
    "http://localhost:19006"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
}));
app.use(express.json());
app.use("/api", doctorRoutes);
// Right after: app.use(express.json());
// Add request logging
app.use((req, res, next) => {
  console.log(`?? ${new Date().toLocaleTimeString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/equipment";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  }
});

// Validation regex
const nameRegex = /^[A-Za-z\s]+$/;
const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

// ========== AUTH ROUTES ==========
// Register
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, userType } = req.body;

    if (!name || !email || !password || !userType)
      return res.json({ success: false, message: "All fields are required." });

    if (!nameRegex.test(name))
      return res.json({ success: false, message: "Name should contain only letters." });

    if (!emailRegex.test(email))
      return res.json({ success: false, message: "Invalid email format." });

    if (!passwordRegex.test(password))
      return res.json({
        success: false,
        message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character."
      });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.json({ success: false, message: "Email already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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

// Verify OTP
app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.json({ success: false, message: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "User not found." });

    if (user.isVerified)
      return res.json({ success: true, message: "Email already verified" });

    if (!user.otp || !user.otpExpiry)
      return res.json({ success: false, message: "OTP expired. Please resend OTP" });

    if (Date.now() > user.otpExpiry)
      return res.json({ success: false, message: "OTP expired. Please resend OTP" });

    if (user.otp !== otp)
      return res.json({ success: false, message: "Invalid OTP" });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
});

// ========== GOOGLE AUTHENTICATION ==========
app.post("/auth/google", async (req, res) => {
  try {
    const { name, email, googleId, picture, userType } = req.body;

    if (!email || !googleId) {
      return res.json({ success: false, message: "Email and Google ID are required" });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists - update Google ID if not set, and log them in
      if (!user.googleId) {
        user.googleId = googleId;
        user.picture = picture;
        await user.save();
      }

      // Check if user is blocked
      if (user.isBlocked) {
        return res.json({ success: false, message: "Your account has been blocked" });
      }

      console.log("✅ Google login successful for:", email);
      return res.json({
        success: true,
        message: "Login successful",
        name: user.name,
        email: user.email,
        userId: user._id,
        userType: user.userType,
        profileCompleted: user.profileCompleted,
      });
    }

    // New user - create account
    if (!userType) {
      return res.json({ success: false, message: "User type is required for new users" });
    }

    user = new User({
      name,
      email,
      googleId,
      picture,
      userType,
      isVerified: true, // Google accounts are pre-verified
      profileCompleted: false,
    });

    await user.save();
    console.log("✅ New Google user created:", email);

    return res.json({
      success: true,
      message: "Registration successful",
      name: user.name,
      email: user.email,
      userId: user._id,
      userType: user.userType,
      profileCompleted: false,
    });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.json({ success: false, message: "Server error during Google authentication" });
  }
});

// Resend OTP
app.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.isVerified) return res.json({ success: false, message: "Email already verified" });

    // Cooldown check
    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt < 40000)
      return res.json({ success: false, message: "Please wait 40 seconds before resending OTP" });

    const newOtp = crypto.randomInt(100000, 999999).toString();
    user.otp = newOtp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otpLastSentAt = new Date();
    await user.save();

    await sendOtpMail(email, newOtp);
    return res.json({ success: true, message: "New OTP sent to your email" });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
});

// Login
// Login route - handle both formats
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.json({ success: false, message: "All fields are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.json({ success: false, message: "Invalid credentials" });

    if (user.isBlocked)
      return res.json({ success: false, message: "Account is blocked. Contact admin." });

    if (!user.isVerified)
      return res.json({ success: false, message: "Please verify your email first" });

    // Normalize userType for validation
    let userType = user.userType || "";

    // Accept both formats
    if (userType === "service-provider" || userType === "service provider") {
      const verificationStatus = user.providerVerification?.status || "";

      if (verificationStatus === "rejected") {
        return res.json({
          success: false,
          message: "Your provider application has been rejected.",
        });
      }

      if (!verificationStatus || verificationStatus === "pending") {
        return res.json({
          success: false,
          message: "Provider account pending admin approval.",
        });
      }

      if (verificationStatus !== "approved") {
        return res.json({
          success: false,
          message: "Account verification required.",
        });
      }

      // Normalize to hyphenated format for response
      userType = "service-provider";
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.json({ success: false, message: "Invalid credentials" });

    console.log("? Login successful for:", user.email);

    return res.json({
      success: true,
      message: "Login successful",
      userType: userType,
      name: user.name,
      email: user.email,
      userId: user._id.toString(),
      profileCompleted: user.profileCompleted || false,
    });

  } catch (err) {
    console.error("? Login error:", err);
    return res.json({
      success: false,
      message: "Server error occurred",
    });
  }
});

// Add these routes to your server.js file

// ========== MEDICAL VIDEO ROUTES ==========

// Get all videos from database
app.get("/api/videos", async (req, res) => {
  try {
    // You need to create a Video model first
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos || []);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// Search YouTube videos
app.get("/api/youtube/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // You need to install youtube-api or googleapis package
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search`,
      {
        params: {
          part: "snippet",
          q: `${q} medical equipment demonstration`,
          key: process.env.YOUTUBE_API_KEY,
          type: "video",
          maxResults: 10,
          relevanceLanguage: "en"
        }
      }
    );

    const videos = response.data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url
    }));

    res.json(videos);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// ========== EQUIPMENT ROUTES ==========
// ✅ FIXED: Get all equipment (for patients)
app.get("/equipment/all", async (req, res) => {
  try {
    console.log("🔍 Fetching all available equipment...");
    const equipment = await Equipment.find({ stock: { $gt: 0 } }) // Only show items with stock > 0
      .sort({ createdAt: -1 })
      .populate("providerId", "name email");

    console.log(`✅ Found ${equipment.length} equipment items`);

    return res.json({ success: true, equipment });
  } catch (err) {
    console.error("❌ Error fetching equipment:", err);
    return res.json({ success: false, message: "Failed to fetch equipment" });
  }
});

app.get("/equipment/provider/:providerId", async (req, res) => {
  try {
    const equipment = await Equipment.find({ providerId: req.params.providerId })
      .sort({ createdAt: -1 });

    return res.json({ success: true, equipment });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Failed to fetch equipment" });
  }
});

app.post("/equipment/add", upload.single("image"), async (req, res) => {
  try {
    console.log("🔧 Equipment add request received");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    const {
      equipmentName,
      description,
      pricePerDay,
      stock,
      providerId,
      providerName,
      category
    } = req.body;

    if (!equipmentName || !description || !pricePerDay || !stock || !providerId || !providerName)
      return res.json({ success: false, message: "All fields are required" });

    const provider = await User.findById(providerId);
    console.log("🔍 Provider found:", provider);

    if (!provider) {
      console.log("❌ Provider not found with ID:", providerId);
      return res.json({ success: false, message: "Provider not found" });
    }

    const isValidProvider = provider.userType === "service-provider" ||
      provider.userType === "service provider";

    if (!isValidProvider) {
      console.log("❌ Invalid user type:", provider.userType);
      return res.json({
        success: false,
        message: `User is not a service provider. User type: ${provider.userType}`
      });
    }

    const imageUrl = req.file ? `/uploads/equipment/${req.file.filename}` : "";

    const equipment = new Equipment({
      equipmentName,
      description,
      pricePerDay: parseFloat(pricePerDay),
      stock: parseInt(stock),
      providerId,
      providerName: provider.name || providerName,
      category: category || "other",
      imageUrl
    });

    await equipment.save();
    console.log("✅ Equipment saved successfully:", equipment);

    return res.json({
      success: true,
      message: "Equipment added successfully",
      equipment
    });
  } catch (err) {
    console.error("❌ Error adding equipment:", err);
    return res.json({
      success: false,
      message: "Failed to add equipment: " + err.message
    });
  }
});

// In your equipment update route
app.put("/equipment/update/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (req.file) {
      updates.imageUrl = `/uploads/equipment/${req.file.filename}`;
    }

    // Find equipment first
    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.json({ success: false, message: "Equipment not found" });
    }

    // Update stock and automatically set isAvailable
    if (updates.stock !== undefined) {
      const stockValue = parseInt(updates.stock);
      equipment.stock = stockValue;
      equipment.isAvailable = stockValue > 0;

      // Save the equipment with proper middleware triggers
      await equipment.save();

      // Remove stock from updates object since we already updated it
      delete updates.stock;
      delete updates.isAvailable;
    }

    // Update other fields if any
    if (Object.keys(updates).length > 0) {
      await Equipment.findByIdAndUpdate(id, { $set: updates });
    }

    // Fetch updated equipment
    const updatedEquipment = await Equipment.findById(id);

    console.log("✅ Equipment updated:", {
      name: updatedEquipment.equipmentName,
      stock: updatedEquipment.stock,
      available: updatedEquipment.isAvailable
    });

    return res.json({
      success: true,
      message: "Equipment updated",
      equipment: updatedEquipment
    });
  } catch (err) {
    console.error("❌ Error updating equipment:", err);
    return res.json({ success: false, message: "Failed to update equipment" });
  }
});

app.get("/fix-equipment-availability", async (req, res) => {
  try {
    console.log("🔧 Fixing equipment availability...");

    const allEquipment = await Equipment.find({});
    let fixedCount = 0;

    for (const equipment of allEquipment) {
      const shouldBeAvailable = equipment.stock > 0;

      if (equipment.isAvailable !== shouldBeAvailable) {
        equipment.isAvailable = shouldBeAvailable;
        await equipment.save();
        console.log(`✅ Fixed ${equipment.equipmentName}: stock=${equipment.stock}, available=${shouldBeAvailable}`);
        fixedCount++;
      }
    }

    return res.json({
      success: true,
      message: `Fixed ${fixedCount} equipment items`,
      fixedCount
    });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Failed to fix equipment" });
  }
});

app.delete("/equipment/delete/:id", async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment)
      return res.json({ success: false, message: "Equipment not found" });

    return res.json({ success: true, message: "Equipment deleted" });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Failed to delete equipment" });
  }
});

app.get("/equipment/:id", async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id)
      .populate("providerId", "name email phoneNumber address");

    if (!equipment)
      return res.json({ success: false, message: "Equipment not found" });

    return res.json({ success: true, equipment });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Failed to fetch equipment" });
  }
});

// Get patient's active equipment (equipment they have booked)
app.get("/patient/:patientId/active-equipment", async (req, res) => {
  try {
    const { patientId } = req.params;

    // Get all bookings for this patient that are not cancelled
    const bookings = await Booking.find({
      patientId,
      status: { $nin: ["cancelled", "completed"] } // Active bookings only
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "equipmentId",
        select: "equipmentName imageUrl description pricePerDay isAvailable stock",
        model: "Equipment"
      })
      .populate("providerId", "name phoneNumber");

    // Extract equipment from bookings
    const activeEquipment = bookings
      .filter(booking => booking.equipmentId) // Only include bookings with equipment
      .map(booking => ({
        ...booking.equipmentId.toObject(),
        bookingDetails: {
          bookingId: booking._id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
          totalAmount: booking.totalAmount
        }
      }));

    return res.json({
      success: true,
      activeEquipment,
      total: activeEquipment.length
    });
  } catch (err) {
    console.error("❌ Error fetching active equipment:", err);
    return res.json({ success: false, message: "Failed to fetch active equipment" });
  }
});

// ========== BOOKING ROUTES ==========
// Create booking
// In your booking creation route in server.js
app.post("/booking/create", async (req, res) => {
  try {
    console.log("📝 ========== BOOKING CREATE REQUEST ==========");
    console.log("📥 Full request body:", JSON.stringify(req.body, null, 2));

    // Extract all variables
    let {
      patientId,
      patientName,
      equipmentId,
      equipmentName,
      providerId,
      providerName,
      startDate,
      endDate,
      pricePerDay,
      quantity = 1,
      deliveryAddress,
      contactPhone,
      notes
    } = req.body;

    console.log("🔍 Quantity requested:", quantity);
    // Log all IDs with type
    console.log("🔍 Patient ID:", patientId, "Type:", typeof patientId);
    console.log("🔍 Equipment ID:", equipmentId, "Type:", typeof equipmentId);
    console.log("🔍 Provider ID:", providerId, "Type:", typeof providerId);
    console.log("🔍 Quantity:", quantity, "Type:", typeof quantity);

    // Check if providerId is an object
    if (providerId && typeof providerId === 'object') {
      console.log("⚠️ ProviderId is an object, extracting _id...");
      console.log("ProviderId object:", JSON.stringify(providerId, null, 2));
      if (providerId._id) {
        providerId = providerId._id;
        console.log("✅ Extracted providerId:", providerId);
      }
    }

    // Validate required fields
    const requiredFields = [
      patientId, equipmentId, startDate, endDate,
      deliveryAddress, contactPhone, pricePerDay
    ];

    const missingFields = requiredFields.filter(field => !field);
    if (missingFields.length > 0) {
      console.log("❌ Missing required fields:", missingFields);
      return res.json({
        success: false,
        message: "Missing required fields: " + missingFields.join(", ")
      });
    }

    // Validate quantity
    if (!quantity || quantity < 1) {
      quantity = 1; // Default to 1
    }

    // Check if patient exists
    console.log("🔍 Checking if patient exists...");
    let patient;
    try {
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        patient = await User.findById(patientId);
        console.log("✅ Patient found:", patient ? `${patient.name} (${patient.email})` : "NOT FOUND");
      } else {
        console.log("❌ Invalid patient ID format:", patientId);
        return res.json({ success: false, message: "Invalid patient ID format" });
      }
    } catch (error) {
      console.error("❌ Error finding patient:", error);
      return res.json({ success: false, message: "Error finding patient" });
    }

    if (!patient) {
      console.log("❌ Patient not found");
      return res.json({ success: false, message: "Patient not found" });
    }

   // Check equipment availability with fresh data
    console.log("🔍 Checking equipment availability...");
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      console.log("❌ Equipment not found");
      return res.json({ success: false, message: "Equipment not found" });
    }

    console.log("📊 Equipment stock:", equipment.stock, "Requested:", quantity);

    // Check stock using the equipment's current stock (not cached)
    if (equipment.stock < quantity) {
      console.log("❌ Not enough stock available");
      return res.json({
        success: false,
        message: `Insufficient stock. Only ${equipment.stock} unit(s) available now.`
      });
    }

    // Check if provider exists
    console.log("🔍 Checking provider...");
    const provider = await User.findById(providerId);
    if (!provider) {
      console.log("❌ Provider not found with ID:", providerId);
      return res.json({ success: false, message: "Provider not found" });
    }
    console.log("✅ Provider found:", provider.name);

    // Parse dates
    console.log("📅 Parsing dates...");
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    console.log("Start:", parsedStartDate.toISOString());
    console.log("End:", parsedEndDate.toISOString());

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      console.log("❌ Invalid date format");
      return res.json({ success: false, message: "Invalid date format" });
    }

    if (parsedEndDate <= parsedStartDate) {
      console.log("❌ End date must be after start date");
      return res.json({ success: false, message: "End date must be after start date" });
    }

    // Calculate total days
    const timeDiff = Math.abs(parsedEndDate - parsedStartDate);
    const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const totalAmount = totalDays * parseFloat(pricePerDay) * parseInt(quantity); // Multiply by quantity

    console.log("📊 Calculations:");
    console.log("- Total days:", totalDays);
    console.log("- Price per day:", pricePerDay);
    console.log("- Quantity:", quantity);
    console.log("- Total amount:", totalAmount);

    // Create booking WITH QUANTITY
    console.log("📝 Creating booking...");
    const booking = new Booking({
      patientId: patient._id,
      patientName: patientName || patient.name,
      equipmentId: equipment._id,
      equipmentName: equipmentName || equipment.equipmentName,
      providerId: provider._id,
      providerName: providerName || provider.name,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      totalDays,
      pricePerDay: parseFloat(pricePerDay),
      quantity: parseInt(quantity), // Save quantity
      totalAmount,
      deliveryAddress,
      contactPhone,
      notes: notes || "",
      status: "confirmed",
      paymentStatus: "paid"
    });

    console.log("📋 Booking document created:", {
      patient: booking.patientName,
      equipment: booking.equipmentName,
      provider: booking.providerName,
      quantity: booking.quantity,
      amount: booking.totalAmount,
      days: booking.totalDays
    });

    // Reduce stock by quantity
    console.log("📦 Reducing equipment stock...");
    equipment.stock -= parseInt(quantity);
    equipment.isAvailable = equipment.stock > 0;
    
    console.log("📊 New stock:", equipment.stock);

    // Save booking and equipment
    await Promise.all([booking.save(), equipment.save()]);

    console.log("✅ Booking created and stock updated!");

    return res.json({
      success: true,
      message: `Booking created successfully for ${quantity} unit(s)`,
      bookingId: booking._id,
      booking: {
        _id: booking._id,
        patientName: booking.patientName,
        equipmentName: booking.equipmentName,
        providerName: booking.providerName,
        quantity: booking.quantity,
        totalAmount: booking.totalAmount,
        status: booking.status,
        startDate: booking.startDate,
        endDate: booking.endDate
      }
    });
  } catch (err) {
    console.error("❌ CRITICAL ERROR:", err);
    console.error("❌ Error stack:", err.stack);
    return res.json({
      success: false,
      message: "Server error: " + err.message
    });
  }
});

// Get patient bookings
// Get patient bookings - DON'T filter by equipment availability
app.get("/booking/patient/:patientId", async (req, res) => {
  try {
    console.log("🔍 Fetching bookings for patient:", req.params.patientId);

    const bookings = await Booking.find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 })
      .populate({
        path: "equipmentId",
        select: "equipmentName imageUrl isAvailable stock", // Include isAvailable and stock
        model: "Equipment"
      })
      .populate("providerId", "name agencyName");

    console.log(`✅ Found ${bookings.length} bookings for patient`);

    // Log equipment status for debugging
    bookings.forEach(booking => {
      if (booking.equipmentId) {
        console.log(`📦 Booking ${booking._id}: ${booking.equipmentId.equipmentName} - Available: ${booking.equipmentId.isAvailable}, Stock: ${booking.equipmentId.stock}`);
      }
    });

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("❌ Error fetching patient bookings:", err);
    return res.json({ success: false, message: "Failed to fetch bookings" });
  }
});

// Get provider bookings
app.get("/booking/provider/:providerId", async (req, res) => {
  try {
    const bookings = await Booking.find({ providerId: req.params.providerId })
      .sort({ createdAt: -1 })
      .populate("equipmentId", "equipmentName imageUrl")
      .populate("patientId", "name email");

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Failed to fetch bookings" });
  }
});

// Update booking status
app.put("/booking/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "in-progress", "completed", "cancelled"].includes(status))
      return res.json({ success: false, message: "Invalid status" });

    const booking = await Booking.findById(id);
    if (!booking) return res.json({ success: false, message: "Booking not found" });

    // If cancelling, return equipment to stock
    if (status === "cancelled" && booking.status !== "cancelled") {
      const equipment = await Equipment.findById(booking.equipmentId);
      if (equipment) {
        equipment.stock += 1;
        if (!equipment.isAvailable) equipment.isAvailable = true;
        await equipment.save();
      }
    }

    booking.status = status;
    await booking.save();

    return res.json({ success: true, message: "Booking status updated", booking });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Failed to update booking" });
  }
});
// ========== PROFILE ROUTES ==========
// Complete patient profile
app.post("/api/patient/complete-profile", async (req, res) => {
  try {
    const { email, fullName, age, gender, phoneNumber, city, primaryCondition } = req.body;

    if (!email || !fullName || !age || !phoneNumber || !city || !primaryCondition)
      return res.json({ success: false, message: "All fields are required" });

    const user = await User.findOneAndUpdate(
      { email },
      {
        name: fullName,
        phoneNumber,
        city,
        age: parseInt(age),
        gender,
        profileCompleted: true
      },
      { new: true }
    );

    if (!user) return res.json({ success: false, message: "User not found" });

    return res.json({ success: true, message: "Profile completed successfully" });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
});

// Complete service provider profile
app.post("/api/service-provider/complete-profile", async (req, res) => {
  try {
    const { email, agencyName, serviceType, phoneNumber, city, licenseNumber } = req.body;

    if (!email || !agencyName || !phoneNumber || !city)
      return res.json({ success: false, message: "All fields are required" });

    const user = await User.findOneAndUpdate(
      { email },
      {
        agencyName,
        serviceType,
        phoneNumber,
        city,
        licenseNumber,
        profileCompleted: true,
        providerVerification: {
          status: "pending",
          verifiedBy: null,
          verifiedAt: null,
          rejectionReason: ""
        }
      },
      { new: true }
    );

    if (!user) return res.json({ success: false, message: "User not found" });

    return res.json({ success: true, message: "Profile submitted for admin approval" });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
});

// Get patient profile
app.get("/api/patient/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password -otp -otpExpiry");

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.userType !== "patient") {
      return res.json({ success: false, message: "User is not a patient" });
    }

    return res.json({
      success: true,
      profile: {
        name: user.name || "",
        email: user.email || "",
        age: user.age || "",
        gender: user.gender || "",
        phoneNumber: user.phoneNumber || "",
        city: user.city || "",
        primaryCondition: user.primaryCondition || "",
        profileCompleted: user.profileCompleted || false,
      }
    });
  } catch (err) {
    console.error("Error fetching patient profile:", err);
    return res.json({ success: false, message: "Server error" });
  }
});

// Update patient profile
app.put("/api/patient/update-profile", async (req, res) => {
  try {
    const { userId, fullName, age, gender, phoneNumber, city, primaryCondition } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "User ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.userType !== "patient") {
      return res.json({ success: false, message: "User is not a patient" });
    }

    // Update fields
    if (fullName) user.name = fullName;
    if (age) user.age = parseInt(age);
    if (gender) user.gender = gender;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (city) user.city = city;
    if (primaryCondition) user.primaryCondition = primaryCondition;

    await user.save();

    return res.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        phoneNumber: user.phoneNumber,
        city: user.city,
        primaryCondition: user.primaryCondition,
      }
    });
  } catch (err) {
    console.error("Error updating patient profile:", err);
    return res.json({ success: false, message: "Server error" });
  }
});

// ========== ADMIN ROUTES ==========
app.post("/admin/login", async (req, res) => {
  const { secretKey, email, password } = req.body;

  if (secretKey !== "POSTJOURNEY2024")
    return res.json({ success: false, message: "Invalid Secret Key" });

  const admin = await User.findOne({ email, userType: "admin" });
  if (!admin) return res.json({ success: false, message: "Admin not found" });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.json({ success: false, message: "Wrong password" });

  res.json({ success: true, message: "Admin Login Successful" });
});

// Get all users for admin
app.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch {
    res.json({ success: false, message: "Failed to fetch users" });
  }
});

// Get all patients for admin
app.get("/admin/patients", async (req, res) => {
  try {
    const users = await User.find({ userType: "patient" }, { password: 0 }).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    console.error("Error fetching patients:", err);
    res.json({ success: false, message: "Failed to fetch patients" });
  }
});

// Get all service providers for admin
app.get("/admin/providers", async (req, res) => {
  try {
    const users = await User.find({ userType: "service-provider" }, { password: 0 }).sort({ createdAt: -1 });
    // Also check for "service provider" with space for backwards compatibility
    const usersWithSpace = await User.find({ userType: "service provider" }, { password: 0 }).sort({ createdAt: -1 });
    const allProviders = [...users, ...usersWithSpace];
    res.json({ success: true, users: allProviders });
  } catch (err) {
    console.error("Error fetching providers:", err);
    res.json({ success: false, message: "Failed to fetch providers" });
  }
});

// Verify/Reject provider (PATCH endpoint for mobile app)
app.patch("/admin/providers/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, deleteAccount } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.json({ success: false, message: "Invalid status" });
    }

    // If deleteAccount is true and status is rejected, delete the user
    if (deleteAccount && status === "rejected") {
      await User.findByIdAndDelete(id);
      return res.json({ success: true, message: "Provider rejected and account deleted" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.json({ success: false, message: "Provider not found" });
    }

    user.providerVerification = {
      status: status,
      verifiedAt: new Date(),
      rejectionReason: rejectionReason || "",
    };

    await user.save();

    res.json({
      success: true,
      message: status === "approved" ? "Provider approved successfully" : "Provider rejected",
      user
    });
  } catch (err) {
    console.error("Error updating provider status:", err);
    res.json({ success: false, message: "Failed to update provider status" });
  }
});

// Block/Unblock user
app.patch("/admin/users/:id/block", async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isBlocked: isBlocked },
      { new: true }
    );

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: isBlocked ? "User blocked successfully" : "User unblocked successfully",
      user
    });
  } catch (err) {
    console.error("Error updating user block status:", err);
    res.json({ success: false, message: "Failed to update user status" });
  }
});

// Delete user (for admin)
app.delete("/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.json({ success: false, message: "Failed to delete user" });
  }
});

// Get user details with related data (for admin)
app.get("/admin/users/:id/details", async (req, res) => {
  try {
    const { id } = req.params;

    // Get user profile
    const user = await User.findById(id).select("-password -otp -otpExpiry");

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    let relatedData = {};

    if (user.userType === "patient") {
      // For patients: Get their booking/purchase history
      const bookings = await Booking.find({ patientId: id })
        .sort({ createdAt: -1 });

      relatedData = {
        bookings: bookings,
        totalBookings: bookings.length,
        totalSpent: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      };
    } else if (user.userType === "service-provider" || user.userType === "service provider") {
      // For providers: Get their equipment and sales
      const equipment = await Equipment.find({ providerId: id })
        .sort({ createdAt: -1 });

      const bookings = await Booking.find({ providerId: id })
        .sort({ createdAt: -1 });

      relatedData = {
        equipment: equipment,
        totalEquipment: equipment.length,
        sales: bookings,
        totalSales: bookings.length,
        totalEarnings: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      };
    }

    res.json({
      success: true,
      user: user,
      relatedData: relatedData
    });
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.json({ success: false, message: "Failed to fetch user details" });
  }
});

// Update user verification status
app.put("/admin/verify-provider/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["approved", "rejected"].includes(status))
      return res.json({ success: false, message: "Invalid status" });

    const user = await User.findById(userId);
    if (!user || user.userType !== "service provider")
      return res.json({ success: false, message: "Service provider not found" });

    user.providerVerification = {
      status,
      verifiedBy: req.body.adminId,
      verifiedAt: new Date(),
      rejectionReason: status === "rejected" ? rejectionReason : ""
    };

    await user.save();
    return res.json({ success: true, message: `Provider ${status} successfully` });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Failed to update verification" });
  }
});

// Block/Unblock user
app.put("/admin/block/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.json({ success: false, message: "User not found" });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ success: true, isBlocked: user.isBlocked });
  } catch {
    res.json({ success: false, message: "Failed to update user" });
  }
});

// Get all bookings for admin
app.get("/admin/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate("patientId", "name email")
      .populate("providerId", "name agencyName")
      .populate("equipmentId", "equipmentName");

    res.json({ success: true, bookings });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to fetch bookings" });
  }
});

// ========== TEST ROUTE ==========
app.get("/", (req, res) => {
  res.json({
    message: "Medical Equipment Marketplace API",
    status: "Running",
    endpoints: {
      auth: ["POST /register", "POST /verify-otp", "POST /login"],
      equipment: ["GET /equipment/all", "GET /equipment/provider/:id", "POST /equipment/add"],
      booking: ["POST /booking/create", "GET /booking/patient/:id", "GET /booking/provider/:id"],
      admin: ["POST /admin/login", "GET /admin/users", "PUT /admin/verify-provider/:id"]
    }
  });
});

// ========== REVIEW ROUTES ==========

// Get reviews for equipment
app.get("/equipment/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 Fetching reviews for equipment ID:", id);

    const equipment = await Equipment.findById(id).select("reviews averageRating totalReviews");

    if (!equipment) {
      console.log("❌ Equipment not found for ID:", id);
      return res.json({ success: false, message: "Equipment not found" });
    }

    console.log("✅ Found equipment:", equipment.equipmentName);
    console.log("📝 Number of reviews:", equipment.reviews?.length || 0);

    return res.json({
      success: true,
      reviews: equipment.reviews || [],
      averageRating: equipment.averageRating || 0,
      totalReviews: equipment.totalReviews || 0
    });

  } catch (err) {
    console.error("❌ Fetch reviews error:", err);
    return res.json({ success: false, message: "Failed to fetch reviews" });
  }
});

// Submit a review
app.post("/equipment/:id/review", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, rating, comment } = req.body;

    console.log("📝 New review submission for equipment:", id);
    console.log("👤 User:", userName, "Rating:", rating);

    if (!userId || !userName || !rating) {
      return res.json({
        success: false,
        message: "User ID, name, and rating are required"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Check if user has booked this equipment before
    const hasBooked = await Booking.findOne({
      patientId: userId,
      equipmentId: id,
      status: "completed"
    });

    if (!hasBooked) {
      console.log("❌ User hasn't completed a booking for this equipment");
      return res.json({
        success: false,
        message: "You must complete a booking before reviewing"
      });
    }

    // Check if user already reviewed
    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.json({ success: false, message: "Equipment not found" });
    }

    const existingReview = equipment.reviews.find(review =>
      review.userId.toString() === userId
    );

    if (existingReview) {
      console.log("❌ User already reviewed this equipment");
      return res.json({
        success: false,
        message: "You have already reviewed this equipment"
      });
    }

    // Add new review
    const newReview = {
      userId,
      userName,
      rating: parseInt(rating),
      comment: comment || "",
      date: new Date()
    };

    equipment.reviews.push(newReview);
    await equipment.save();

    console.log("✅ Review submitted successfully");
    console.log("📊 New average rating:", equipment.averageRating);
    console.log("🔢 Total reviews:", equipment.totalReviews);

    return res.json({
      success: true,
      message: "Review submitted successfully",
      averageRating: equipment.averageRating,
      totalReviews: equipment.totalReviews
    });

  } catch (err) {
    console.error("❌ Review submission error:", err);
    return res.json({ success: false, message: "Failed to submit review" });
  }
});


// Check if user can review
app.get("/equipment/:id/can-review/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;
    console.log("🔍 Checking review eligibility for user:", userId, "equipment:", id);

    // Check if user has completed a booking
    const hasBooked = await Booking.findOne({
      patientId: userId,
      equipmentId: id,
      status: "completed"
    });

    console.log("📋 Has booked:", !!hasBooked);

    // Check if user already reviewed
    const equipment = await Equipment.findById(id);
    if (!equipment) {
      return res.json({ success: false, message: "Equipment not found" });
    }

    const hasReviewed = equipment.reviews?.some(review =>
      review.userId.toString() === userId
    ) || false;

    console.log("📝 Has reviewed:", hasReviewed);
    console.log("✅ Can review:", !!hasBooked && !hasReviewed);

    return res.json({
      success: true,
      canReview: !!hasBooked && !hasReviewed,
      hasBooked: !!hasBooked,
      hasReviewed
    });

  } catch (err) {
    console.error("❌ Check review eligibility error:", err);
    return res.json({ success: false, message: "Failed to check review eligibility" });
  }
});

// Add this right after your review routes (around line 700)
app.get("/test-reviews", (req, res) => {
  console.log("✅ Test reviews route hit!");
  res.json({ success: true, message: "Test route works!", timestamp: new Date() });
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: "File upload error: " + err.message });
  }
  res.status(500).json({ success: false, message: "Internal server error" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});
// Test provider endpoint
app.get("/test-provider/:id", async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    if (!provider) {
      return res.json({ success: false, message: "Provider not found" });
    }

    res.json({
      success: true,
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        userType: provider.userType,
        providerVerification: provider.providerVerification
      }
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} (LAN enabled)`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, "uploads")}`);
});