const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },  // Budget limit
  period: { type: String, default: "monthly" } // could be weekly/monthly
});

module.exports = mongoose.model("Budget", budgetSchema);
