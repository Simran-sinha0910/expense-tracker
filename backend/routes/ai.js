const express = require("express");
const auth = require("../middleware/auth");
const { generateAiInsights } = require("../utils/ai");

const router = express.Router();

// Simple in-memory throttle: per user+period at most once per 15s
const lastAiCall = new Map(); // key: `${userId}:${period}` => ts
const THROTTLE_MS = 15 * 1000;

// POST /api/ai/insights { period?: 'monthly' | 'weekly' }
router.post("/insights", auth, async (req, res) => {
  try {
    const period = (req.body?.period || "monthly").toLowerCase();
    const key = `${req.user.id}:${period}`;
    const now = Date.now();
    const prev = lastAiCall.get(key) || 0;
    if (now - prev < THROTTLE_MS) {
      return res.status(204).json({ message: "Throttled" });
    }
    lastAiCall.set(key, now);

    const { summary, tips } = await generateAiInsights(req.user.id, period);
    // If no AI tips (missing key or error), return 204 to signal fallback
    if (!tips || !tips.length) return res.status(204).json({ message: "AI tips unavailable" });
    return res.json({ tips, summary });
  } catch (err) {
    console.error("/api/ai/insights error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
