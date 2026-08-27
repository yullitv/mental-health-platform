const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// requireAuth() тут навмисно НЕ використовуємо: за замовчуванням, коли
// автентифікація не проходить, він робить редірект (302) замість того,
// щоб повернути JSON — це ламає fetch() на фронтенді (він намагається
// розпарсити HTML/текст як JSON). syncUser сам перевіряє userId через
// getAuth(req) і коректно повертає 401 у форматі JSON, якщо юзер не
// авторизований.
router.post("/sync", authController.syncUser);

module.exports = router;
