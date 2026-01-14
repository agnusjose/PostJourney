// admin.routes.js - COMPLETE VERSION
import express from "express";
const router = express.Router();

console.log("✅ Admin routes file loaded");

// Test route
router.get("/test", (req, res) => {
  console.log("🔹 /admin/test route called");
  res.json({ 
    success: true, 
    message: "Admin routes are working!",
    timestamp: new Date().toISOString()
  });
});

// ========== GET ALL PATIENTS ==========
router.get("/patients", async (req, res) => {
  console.log("🔹 /admin/patients route called");
  try {
    const User = (await import("../models/User.js")).default;
    const patients = await User.find({ userType: "patient" })
      .select("-password")
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      message: `Found ${patients.length} patients`,
      users: patients,
      count: patients.length
    });
  } catch (err) {
    console.error("Error fetching patients:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch patients",
      error: err.message 
    });
  }
});

// ========== GET ALL PROVIDERS ==========
router.get("/providers", async (req, res) => {
  console.log("🔹 /admin/providers route called");
  try {
    const User = (await import("../models/User.js")).default;
    const providers = await User.find({ userType: "service provider" })
      .select("-password")
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      message: `Found ${providers.length} providers`,
      users: providers,
      count: providers.length
    });
  } catch (err) {
    console.error("Error fetching providers:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch providers",
      error: err.message 
    });
  }
});

// ========== GET ALL USERS ==========
router.get("/users", async (req, res) => {
  console.log("🔹 /admin/users route called");
  try {
    const User = (await import("../models/User.js")).default;
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      message: `Found ${users.length} users`,
      users: users,
      count: users.length
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch users",
      error: err.message 
    });
  }
});

// ========== BLOCK/UNBLOCK USER ==========
router.patch("/users/:id/block", async (req, res) => {
  console.log("🔹 Block/Unblock user:", req.params.id, req.body);
  const { isBlocked } = req.body;
  
  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    user.isBlocked = isBlocked;
    await user.save();
    
    res.json({ 
      success: true, 
      message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked
      }
    });
  } catch (err) {
    console.error("Block user error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update user block status",
      error: err.message 
    });
  }
});

// ========== DELETE USER ==========
router.delete("/users/:id", async (req, res) => {
  console.log("🔹 Delete user:", req.params.id);
  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      message: "User deleted successfully",
      deletedUser: {
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete user",
      error: err.message 
    });
  }
});

// ========== VERIFY PROVIDER (WITH STRICT REJECTION LOGIC) ==========
router.patch("/providers/:id/verify", async (req, res) => {
  console.log("🔹 Verify provider:", req.params.id, req.body);
  const { status, reason, autoDelete = false } = req.body;
  
  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.params.id);
    
    if (!user || user.userType !== "service provider") {
      return res.status(404).json({ 
        success: false, 
        message: "Service provider not found" 
      });
    }
    
    // If rejected AND autoDelete is true, DELETE the user
    if (status === "rejected" && autoDelete === true) {
      await User.findByIdAndDelete(req.params.id);
      
      return res.json({
        success: true,
        message: "Provider rejected and deleted successfully",
        reason: reason,
        action: "deleted"
      });
    }
    
    // If rejected but NOT auto-deleted, mark as rejected (user cannot login)
    if (status === "rejected") {
      user.providerVerification = {
        status: "rejected",
        rejectionReason: reason || "No reason provided",
        reviewedByAdminAt: new Date(),
      };
      
      await user.save();
      
      return res.json({
        success: true,
        message: "Provider rejected successfully. User cannot login.",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          providerVerification: user.providerVerification
        }
      });
    }
    
    // If approved
    if (status === "approved") {
      user.providerVerification = {
        status: "approved",
        reviewedByAdminAt: new Date(),
      };
      
      await user.save();
      
      return res.json({
        success: true,
        message: "Provider approved successfully",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          providerVerification: user.providerVerification
        }
      });
    }
    
    // Invalid status
    return res.status(400).json({
      success: false,
      message: "Invalid status. Use 'approved' or 'rejected'"
    });
    
  } catch (err) {
    console.error("Verify provider error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update provider verification",
      error: err.message 
    });
  }
});

// ========== GET DASHBOARD STATISTICS ==========
router.get("/dashboard-stats", async (req, res) => {
  console.log("🔹 /admin/dashboard-stats route called");
  try {
    const User = (await import("../models/User.js")).default;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Total counts
    const totalUsers = await User.countDocuments();
    const totalPatients = await User.countDocuments({ userType: "patient" });
    const totalProviders = await User.countDocuments({ userType: "service provider" });
    
    // Today's registrations
    const todaysRegistrations = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Verified vs unverified
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const unverifiedUsers = await User.countDocuments({ isVerified: false });
    
    // Blocked users
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    
    // Provider verification stats
    const approvedProviders = await User.countDocuments({
      userType: "service provider",
      "providerVerification.status": "approved"
    });
    
    const pendingProviders = await User.countDocuments({
      userType: "service provider",
      $or: [
        { "providerVerification.status": "pending" },
        { "providerVerification.status": { $exists: false } }
      ]
    });
    
    const rejectedProviders = await User.countDocuments({
      userType: "service provider",
      "providerVerification.status": "rejected"
    });
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPatients,
        totalProviders,
        todaysRegistrations,
        verifiedUsers,
        unverifiedUsers,
        blockedUsers,
        providerVerification: {
          approved: approvedProviders,
          pending: pendingProviders,
          rejected: rejectedProviders
        }
      }
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch dashboard statistics",
      error: err.message 
    });
  }
});

// ========== GET USER DETAILS ==========
router.get("/users/:id", async (req, res) => {
  console.log("🔹 Get user details:", req.params.id);
  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.params.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    res.json({
      success: true,
      user: user
    });
  } catch (err) {
    console.error("Get user details error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch user details",
      error: err.message 
    });
  }
});

export default router;