const prisma = require("../prisma");

const MAX_CIPHERTEXT_LENGTH = 10000;

// GET /api/safety-plan/mine — один запис на користувача (не по днях).
// Розшифровка відбувається виключно на клієнті ключем, якого сервер не має.
exports.getMine = async (req, res) => {
  try {
    const plan = await prisma.safetyPlan.findUnique({
      where: { userId: req.dbUser.id },
    });
    res.status(200).json(plan);
  } catch (error) {
    console.error("❌ Помилка отримання аптечки ресурсу:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// PUT /api/safety-plan — повне збереження (upsert) зашифрованої аптечки.
// Сервер НЕ бачить прості дії/спогади/цитати/контакти у відкритому вигляді —
// вони зашифровані на клієнті (AES-GCM), тут лише opaque-блоб cipherText.
exports.upsert = async (req, res) => {
  try {
    const { cipherText } = req.body;

    if (typeof cipherText !== "string" || cipherText.length === 0) {
      return res.status(400).json({ message: "cipherText обов'язковий" });
    }
    if (cipherText.length > MAX_CIPHERTEXT_LENGTH) {
      return res.status(400).json({ message: "Аптечка занадто велика" });
    }

    const plan = await prisma.safetyPlan.upsert({
      where: { userId: req.dbUser.id },
      update: { cipherText },
      create: { userId: req.dbUser.id, cipherText },
    });

    res.status(200).json(plan);
  } catch (error) {
    console.error("❌ Помилка збереження аптечки ресурсу:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
