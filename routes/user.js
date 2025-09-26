const express = require("express");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// GET current user's profile
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email createdAt updatedAt");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("GET /api/user/me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE current user's profile
router.put("/me", auth, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true, context: 'query' }
    ).select("name email createdAt updatedAt");

    res.json(updated);
  } catch (err) {
    console.error("PUT /api/user/me error:", err);
    // Handle duplicate email error
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(400).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
