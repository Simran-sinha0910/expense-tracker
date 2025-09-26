const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },   // frontend sends this
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    budget: { type: Number, default: 0 } 
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
