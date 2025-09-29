const Expense = require("../models/Expense");
const Budget = require("../models/Budget");

// Summarize user spend/budget compactly to keep tokens low and avoid PII
async function buildUserFinanceSummary(userId, period = "monthly", maxItems = 200) {
  const budgetDoc = await Budget.findOne({ userId, period });
  const budget = Number(budgetDoc?.amount || 0);

  // Pull recent expenses in the current period
  const now = new Date();
  let start;
  if ((period || "monthly") === "weekly") {
    const day = now.getDay();
    const diff = (day + 6) % 7;
    start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const expenses = await Expense.find({ user: userId, date: { $gte: start } })
    .sort({ date: -1 })
    .limit(maxItems)
    .lean();

  const byCategory = {};
  let total = 0;
  for (const e of expenses) {
    const cat = e.type || "Other";
    const amt = Number(e.amount || 0);
    byCategory[cat] = (byCategory[cat] || 0) + amt;
    total += amt;
  }

  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topCats = entries.slice(0, 8).map(([k, v]) => ({ category: k, amount: Math.round(v) }));

  return {
    period,
    budget,
    totalSpent: Math.round(total),
    categories: topCats,
  };
}

// Generate AI insights via OpenAI if OPENAI_API_KEY is set, otherwise return null
async function callOpenAIForInsights(summary) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Use native fetch (Node 18+). If not available, the call will throw and we fallback.
  const system = "You are a helpful personal finance coach. Be concise, positive, and actionable. Output a JSON object with a 'tips' array of strings (3-7 items). Do not include any other text.";
  const userPrompt = `Data Summary (sanitized):\n${JSON.stringify(summary)}\n\nGenerate friendly, motivating recommendations. Focus on: high-spend categories, budget alerts, savings opportunities, recurring expenses, trends, and small actions.`;

  const body = {
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 400,
  };

  const maxRetries = 3;
  let attempt = 0;
  let lastError = null;
  while (attempt < maxRetries) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || "";
        let parsed = null;
        try { parsed = JSON.parse(content); } catch {
          const match = content.match(/\{[\s\S]*\}/);
          if (match) { try { parsed = JSON.parse(match[0]); } catch {}
          }
        }
        if (!parsed || !Array.isArray(parsed.tips)) return null;
        const tips = parsed.tips.map(t => String(t).trim()).filter(Boolean);
        return tips.length ? tips : null;
      }

      // Handle rate limit or server errors with backoff
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        const baseDelay = Math.pow(2, attempt) * 500; // 0.5s, 1s, 2s
        const delay = Math.max(baseDelay, retryAfter * 1000);
        attempt++;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // Non-retryable error
      lastError = new Error(`OpenAI HTTP ${res.status}`);
      break;
    } catch (e) {
      lastError = e;
      // brief backoff on network errors
      const delay = Math.pow(2, attempt) * 400;
      attempt++;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error("AI insights error:", lastError?.message || lastError);
  return null;
}

async function generateAiInsights(userId, period = "monthly") {
  const summary = await buildUserFinanceSummary(userId, period);
  const tips = await callOpenAIForInsights(summary);
  return { summary, tips: Array.isArray(tips) ? tips : null };
}

module.exports = { generateAiInsights, buildUserFinanceSummary };
