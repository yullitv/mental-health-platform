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

const app = express();

app.use(cors());
app.use(express.json());

// Тепер це запрацює!
app.use(clerkMiddleware());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Mental Health API with Clerk Express is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Сервер на порту ${PORT}`));
