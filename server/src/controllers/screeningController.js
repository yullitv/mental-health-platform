const prisma = require("../prisma");

const VALID_TEST_KEYS = ["phq9", "gad7"];
const MAX_CIPHERTEXT_LENGTH = 5000;

// POST /api/screening — зберегти результат скринінг-тесту.
// Сервер бачить лише testKey (яку шкалу проходили) і дату — бали,
// відповіді та рівень вираженості зашифровані на клієнті тим самим
// локальним ключем, що й щоденник (AES-GCM, сервер його не має).
exports.createResult = async (req, res) => {
  try {
    const { testKey, cipherText } = req.body;

    if (!VALID_TEST_KEYS.includes(testKey)) {
      return res.status(400).json({ message: "Невідомий тип тесту" });
    }
    if (typeof cipherText !== "string" || cipherText.length === 0) {
      return res.status(400).json({ message: "cipherText обов'язковий" });
    }
    if (cipherText.length > MAX_CIPHERTEXT_LENGTH) {
      return res.status(400).json({ message: "Запис занадто великий" });
    }

    const result = await prisma.screeningResult.create({
      data: { userId: req.dbUser.id, testKey, cipherText },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("❌ Помилка збереження результату тесту:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// GET /api/screening/mine — усі зашифровані результати поточного користувача.
exports.getMyResults = async (req, res) => {
  try {
    const results = await prisma.screeningResult.findMany({
      where: { userId: req.dbUser.id },
      orderBy: { date: "asc" },
    });
    res.status(200).json(results);
  } catch (error) {
    console.error("❌ Помилка отримання результатів тестів:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
