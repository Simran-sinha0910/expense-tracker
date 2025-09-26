const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Budget = require("../models/Budget");
const User = require("../models/User");

// NEW: import mailer
const { sendMail } = require("../utils/mailer");

// --- Existing GET and POST endpoints remain unchanged ---

// Get current budget (supports period: weekly | monthly)
router.get("/", auth, async (req, res) => {
  try {
    const period = (req.query.period || "monthly").toLowerCase();

    const existing = await Budget.findOne({ userId: req.user.id, period });
    if (existing) return res.json({ budget: existing.amount, period });

    const user = await User.findById(req.user.id).select("budget");
    return res.json({ budget: user?.budget || 0, period });
  } catch (err) {
    console.error("GET /api/budget error:", err);
    res.status(500).send("Server Error");
  }
});

// Set/Update budget
router.post("/", auth, async (req, res) => {
  try {
    let { budget, period } = req.body;
    period = (period || "monthly").toLowerCase();
    const amount = Number(budget) || 0;

    const updated = await Budget.findOneAndUpdate(
      { userId: req.user.id, period },
      { $set: { amount, period, userId: req.user.id } },
      { upsert: true, new: true }
    );

    res.json({ budget: updated.amount, period: updated.period });
  } catch (err) {
    console.error("POST /api/budget error:", err);
    res.status(500).send("Server Error");
  }
});

// ---------------- NEW: Budget Check + Email Alert ----------------

// Check budget usage and send email if ≥80%
router.get("/check", auth, async (req, res) => {
  try {
    const period = (req.query.period || "monthly").toLowerCase();
    const budgetDoc = await Budget.findOne({ userId: req.user.id, period });
    if (!budgetDoc) return res.status(404).json({ message: "Budget not set" });

    // Get total expenses for this period
    const Expense = require("../models/Expense");
    const now = new Date();
    let start;
    if (period === "weekly") {
      const day = now.getDay();
      const diff = (day + 6) % 7;
      start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const expenses = await Expense.find({
      user: req.user.id,
      date: { $gte: start },
    });

    const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
    const percent = (totalSpent / budgetDoc.amount) * 100;
    const remaining = budgetDoc.amount - totalSpent;

    // Send email if ≥80%
    if (percent >= 80) {
      const userEmail = req.user.email; // make sure auth middleware provides email
      await sendMail(
        userEmail,
        "⚠️ Budget Alert",
        `You have used ${percent.toFixed(1)}% of your ${period} budget.\nRemaining budget: ₹${remaining.toFixed(2)}`
      );
    }

    res.json({ totalSpent, budget: budgetDoc.amount, percent, remaining });
  } catch (err) {
    console.error("GET /api/budget/check error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
