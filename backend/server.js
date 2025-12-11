import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/postJourneyDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  userType: String,
});

const User = mongoose.model('User', userSchema);

// Validation regex
const nameRegex = /^[A-Za-z\s]+$/;
const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

// Allowed email domains
const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com'];

// Register Route
app.post('/register', async (req, res) => {
  try {
    const { name, email, password, userType } = req.body;

    if (!name || !email || !password || !userType) {
      return res.json({ success: false, message: 'All fields are required.' });
    }

    // Name validation
    if (!nameRegex.test(name)) {
      return res.json({ success: false, message: 'Name should contain only letters.' });
    }

    // Email format validation
    if (!emailRegex.test(email)) {
      return res.json({ success: false, message: 'Invalid email format.' });
    }

    // Email domain validation
    const domain = email.split('@')[1];
    if (!allowedDomains.includes(domain)) {
      return res.json({ success: false, message: 'Email domain not allowed.' });
    }

    // Password validation
    if (!passwordRegex.test(password)) {
      return res.json({ 
        success: false, 
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' 
      });
    }

    // User type validation
    if (!['patient', 'service provider'].includes(userType)) {
      return res.json({ success: false, message: 'User type must be either patient or service provider.' });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, userType });
    await user.save();

    return res.json({ success: true, message: 'User registered successfully.' });

  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: 'Server error occurred.' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, message: 'All fields are required.' });

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json({ success: false, message: 'Invalid credentials.' });

    return res.json({ success: true, message: 'Login successful.', userType: user.userType });

  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: 'Server error occurred.' });
  }
});

import videoRoutes from "./routes/videoRoutes.js";
app.use("/videos", videoRoutes);


// Admin Login
app.post("/admin/login", async (req, res) => {
  const { secretKey, email, password } = req.body;

  console.log("ADMIN LOGIN ATTEMPT");
  console.log("Secret key entered:", secretKey);
  console.log("Email entered:", email);

  // Step 1: Validate secret key
  if (secretKey !== "POSTJOURNEY2024") {
    console.log("❌ Wrong secret key");
    return res.json({ success: false, message: "Invalid Secret Key" });
  }

  // Step 2: Find admin
  const admin = await User.findOne({ email, userType: "admin" });

  if (!admin) {
    console.log("❌ Admin not found in DB");
    return res.json({ success: false, message: "Admin not found" });
  }

  console.log("Stored hashed password:", admin.password);
  console.log("Typed password:", password);

  // Step 3: Compare hashed password
  const isMatch = await bcrypt.compare(password, admin.password);
  console.log("Password match result:", isMatch);

  if (!isMatch) {
    return res.json({ success: false, message: "Wrong password" });
  }

  // SUCCESS
  return res.json({ success: true, message: "Admin Login Successful" });
});

app.get("/admin/test", (req, res) => {
  res.send("Admin route OK");
});



app.listen(5000, () => {
  console.log('Server running on port 5000');
});

