const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMail({ to, subject, text }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ EMAIL_USER/EMAIL_PASS не задані — email не надіслано");
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Опора" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log("📧 Email надіслано:", to);
  } catch (error) {
    console.error("❌ Помилка надсилання email:", error.message);
  }
}

module.exports = { sendMail };