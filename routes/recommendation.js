const express = require("express");
const auth = require("../middleware/auth");
const { getRecommendations } = require("../utils/recommendation");
const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const data = await getRecommendations(req.user.id);
    res.json(data);
  } catch (err) {
    console.error("❌ Recommendation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
