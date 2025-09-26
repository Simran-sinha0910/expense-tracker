const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const nodemailer = require("nodemailer"); // ✅ added
const cron = require("node-cron");

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/expenses", require("./routes/expenses"));
app.use("/api/budget", require("./routes/budget")); // ✅ budget route
app.use("/api/user", require("./routes/user")); 
app.use("/api/recommendation", require("./routes/recommendation"));
// ✅ user profile route

// ------------------- Nodemailer Transporter -------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER, // email from .env
    pass: process.env.MAIL_PASS  // app password from .env
  }
});

// ------------------- Instant Email Alert Route -------------------
app.post("/api/send-budget-warning", async (req, res) => {
  const { email, percent, remaining } = req.body;

  try {
    const mailOptions = {
      from: `"Expense Tracker" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "⚠️ Budget Alert",
      text: `You have used ${percent.toFixed(1)}% of your budget. Remaining budget: $${remaining.toFixed(2)}. Please review your spending.`
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully" });
  } catch (err) {
    console.error("❌ Mail error:", err);
    res.status(500).json({ success: false, message: "Email failed" });
  }
});

// ------------------- MongoDB Connection -------------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ------------------- Daily Cron Job -------------------
const Budget = require("./models/Budget");
const Expense = require("./models/Expense");
const User = require("./models/User");

cron.schedule("0 9 * * *", async () => { // Runs every day at 9 AM
  try {
    console.log("🕘 Running daily budget summary...");

    const users = await User.find();
    for (const user of users) {
      const budgetDoc = await Budget.findOne({ userId: user._id, period: "monthly" });
      if (!budgetDoc) continue;

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const expenses = await Expense.find({
        user: user._id,
        date: { $gte: startOfMonth }
      });

      const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
      const percent = (totalSpent / budgetDoc.amount) * 100;
      const remaining = budgetDoc.amount - totalSpent;

      await transporter.sendMail({
        from: `"Expense Tracker" <${process.env.MAIL_USER}>`,
        to: user.email,
        subject: "📊 Daily Budget Summary",
        text: `Hello ${user.name || ""},\n\nYou have used ${percent.toFixed(1)}% of your monthly budget.\nRemaining budget: $${remaining.toFixed(2)}.\n\nKeep tracking your expenses!`
      });
    }
  } catch (err) {
    console.error("❌ Error in daily cron:", err);
  }
});

// ------------------- Start Server -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
