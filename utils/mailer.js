// backend/utils/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendMail(to, subject, text) {
  try {
    await transporter.sendMail({ from: process.env.MAIL_USER, to, subject, text });
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
}

module.exports = { sendMail };
