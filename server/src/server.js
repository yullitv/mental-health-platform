const express = require("express");
const cors = require("cors");
require("dotenv").config();
console.log("--- Перевірка ключів ---");
console.log("Publishable Key існує:", !!process.env.CLERK_PUBLISHABLE_KEY);
console.log("Secret Key існує:", !!process.env.CLERK_SECRET_KEY);
console.log("------------------------");
// Зверни увагу на зміну назви пакета в require
const { clerkMiddleware } = require("@clerk/express");

const authRoutes = require("./routes/authRoutes");
const fundraiserRoutes = require("./routes/fundraiserRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const donationRoutes = require("./routes/donationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const specialistRoutes = require("./routes/specialistRoutes");
const diaryRoutes = require("./routes/diaryRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Тепер це запрацює!
app.use(clerkMiddleware());

app.use("/api/auth", authRoutes);
app.use("/api/fundraisers", fundraiserRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/specialists", specialistRoutes);
app.use("/api/diary", diaryRoutes);


app.get("/", (req, res) => {
  res.send("Mental Health API with Clerk Express is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Сервер на порту ${PORT}`));