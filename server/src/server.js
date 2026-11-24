const express = require("express");
const cors = require("cors");
require("dotenv").config();

if (process.env.NODE_ENV !== "production") {
  console.log("--- Перевірка ключів ---");
  console.log("Publishable Key існує:", !!process.env.CLERK_PUBLISHABLE_KEY);
  console.log("Secret Key існує:", !!process.env.CLERK_SECRET_KEY);
  console.log("------------------------");
}

const http = require("http");
const helmet = require("helmet");
// Зверни увагу на зміну назви пакета в require
const { clerkMiddleware } = require("@clerk/express");
const { initSocket } = require("./socket");
const { allowedOrigins } = require("./corsConfig");
const { apiLimiter } = require("./middlewares/rateLimiters");

const authRoutes = require("./routes/authRoutes");
const fundraiserRoutes = require("./routes/fundraiserRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const donationRoutes = require("./routes/donationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const specialistRoutes = require("./routes/specialistRoutes");
const diaryRoutes = require("./routes/diaryRoutes");
const thoughtAnalysisRoutes = require("./routes/thoughtAnalysisRoutes");
const screeningRoutes = require("./routes/screeningRoutes");
const companionRoutes = require("./routes/companionRoutes");
const safetyPlanRoutes = require("./routes/safetyPlanRoutes");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const clerk = clerkMiddleware();
app.use((req, res, next) => {
  let handled = false;
  const afterAuth = (err) => {
    if (handled) return;
    handled = true;
    if (err) {
      return res
        .status(401)
        .json({ message: "Недійсний токен автентифікації" });
    }
    next();
  };
  Promise.resolve(clerk(req, res, afterAuth)).catch(afterAuth);
});

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/fundraisers", fundraiserRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/specialists", specialistRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/thought-analysis", thoughtAnalysisRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/companion", companionRoutes);
app.use("/api/safety-plan", safetyPlanRoutes);

app.get("/", (req, res) => {
  res.send("Mental Health API with Clerk Express is running...");
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Маршрут не знайдено" });
});

app.use((err, req, res, next) => {
  console.error("❌ Необроблена помилка:", err);
  res.status(err.status || 500).json({ message: "Помилка сервера" });
});

const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Сервер на порту ${PORT}`));
