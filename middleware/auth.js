const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Import User model

module.exports = async function (req, res, next) {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);

    // Attach user info from DB to req.user
    const user = await User.findById(decoded.id).select("id email");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = { id: user.id, email: user.email }; // include email
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};
