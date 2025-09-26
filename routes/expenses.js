const express = require("express");
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const User = require("../models/User");
const auth = require("../middleware/auth");
const router = express.Router();

// Nodemailer transporter
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// ✅ GET all expenses for logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error("❌ GET expenses error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ ADD new expense
router.post("/", auth, async (req, res) => {
  try {
    const { description, type, amount, details, date } = req.body;

    if (!description || !type || !amount) {
      return res.status(400).json({ message: "Please provide description, type, and amount" });
    }

    const expense = new Expense({
      user: req.user.id,
      description,
      type,
      amount,
      details,
      date: date || new Date()
    });

    await expense.save();

    // ---------------- Budget Alert (Async) ----------------
    (async () => {
      try {
        const budgetDoc = await Budget.findOne({ userId: req.user.id, period: "monthly" });
        if (!budgetDoc) return;

        const expenses = await Expense.find({
          user: req.user.id,
          date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        });

        const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
        const percent = (totalSpent / budgetDoc.amount) * 100;
        const remaining = budgetDoc.amount - totalSpent;

        if (percent >= 80) {
          const user = await User.findById(req.user.id);
          await transporter.sendMail({
            from: `"Expense Tracker" <${process.env.MAIL_USER}>`,
            to: user.email,
            subject: "⚠️ Budget Alert",
            text: `You have used ${percent.toFixed(1)}% of your monthly budget.\nRemaining budget:₹${remaining.toFixed(2)}.`
          });
        }
      } catch (err) {
        console.error("❌ Budget email error:", err);
      }
    })();

    // Respond instantly
    res.status(201).json(expense);
  } catch (err) {
    console.error("❌ ADD expense error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ DELETE expense
router.delete("/:id", auth, async (req, res) => {
  try {
    const exp = await Expense.findById(req.params.id);
    if (!exp) return res.status(404).json({ message: "Expense not found" });

    if (exp.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await exp.deleteOne();
    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("❌ DELETE expense error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
// ✅ GET Recommendations & Tips
router.get("/tips", auth, async (req, res) => {
  try {
    // Fetch all expenses for the user
    const expenses = await Expense.find({ user: req.user.id });

    if (!expenses.length) {
      return res.json({ tips: ["No expenses recorded yet. Start adding expenses to get tips!"] });
    }

    // Calculate total and category percentages
    const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
    const categoryTotals = {};

    expenses.forEach(e => {
      if (!categoryTotals[e.type]) categoryTotals[e.type] = 0;
      categoryTotals[e.type] += e.amount;
    });

    const tips = [];
    for (let category in categoryTotals) {
      const percent = ((categoryTotals[category] / totalSpent) * 100).toFixed(1);

      if (percent > 30) {
        tips.push(`You spent ${percent}% of your budget on ${category}. Consider reducing it.`);
      } else if (percent > 15) {
        tips.push(`You spent ${percent}% of your budget on ${category}. Keep an eye on it.`);
      } else {
        tips.push(`Your spending on ${category} is well managed at ${percent}%.`);
      }
    }

    res.json({ tips });
  } catch (err) {
    console.error("❌ GET tips error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

