const Expense = require("../models/Expense");
const Budget = require("../models/Budget");

async function getRecommendations(userId) {
  const budgetDoc = await Budget.findOne({ userId, period: "monthly" });
  if (!budgetDoc) return { message: "No budget set" };

  const expenses = await Expense.find({ user: userId });

  // Total spent
  const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
  const percentUsed = (totalSpent / budgetDoc.amount) * 100;
  const remaining = budgetDoc.amount - totalSpent;

  // Category analysis
  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.type] = (categoryTotals[exp.type] || 0) + exp.amount;
  });

  // Find top spending category
  const topCategory = Object.keys(categoryTotals).reduce((a, b) => 
    categoryTotals[a] > categoryTotals[b] ? a : b, ""
  );

  // Recommendations array
  const recommendations = [];

  // Budget usage tips
  if (percentUsed >= 90) recommendations.push("⚠ You have used over 90% of your monthly budget! Avoid new unnecessary expenses.");
  else if (percentUsed >= 70) recommendations.push("You are close to your budget. Monitor your spending carefully.");
  else if (percentUsed <= 50) recommendations.push("Good job! Less than half your budget is used. You can save or invest the remaining.");

  // Category-specific advice
  for (let [category, amount] of Object.entries(categoryTotals)) {
    const percentCategory = (amount / totalSpent) * 100;
    if (percentCategory >= 40) {
      recommendations.push(`You spent ${percentCategory.toFixed(1)}% of your expenses on ${category}. Consider limiting spending in this category.`);
    }
  }

  // General money-saving tips
  if (totalSpent > budgetDoc.amount * 0.8) {
    recommendations.push("Avoid luxury or impulse purchases this month.");
  }
  if (categoryTotals["Food"] && categoryTotals["Food"] / totalSpent > 0.3) {
    recommendations.push("Cook at home more often to save money on food.");
  }
  if (categoryTotals["Entertainment"] && categoryTotals["Entertainment"] / totalSpent > 0.2) {
    recommendations.push("Limit entertainment subscriptions or outings temporarily.");
  }

  // Smart saving tip
  const suggestedSavings = remaining * 0.3;
  if (suggestedSavings > 0) {
    recommendations.push(`Try to save at least ₹${suggestedSavings.toFixed(2)} from remaining budget.`);
  }

  return {
    totalSpent,
    remaining,
    percentUsed: percentUsed.toFixed(1),
    topCategory,
    recommendations
  };
}

module.exports = { getRecommendations };
