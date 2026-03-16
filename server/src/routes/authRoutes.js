const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
// Змінюємо на @clerk/express
const { requireAuth } = require("@clerk/express");

router.post("/sync", requireAuth(), authController.syncUser);

module.exports = router;