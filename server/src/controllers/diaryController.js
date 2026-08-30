const prisma = require("../prisma");

function normalizeDate(input) {
  const d = input ? new Date(input) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const MAX_CIPHERTEXT_LENGTH = 20000;

// POST /api/diary — записати (або оновити) зашифрований запис за день.
// Сервер НЕ бачить mood/physicalState/sleepHours/note у відкритому вигляді —
// вони зашифровані на клієнті (AES-GCM), тут лише opaque-блоб cipherText.
exports.upsertEntry = async (req, res) => {
  try {
    const { date, cipherText } = req.body;

    if (typeof cipherText !== "string" || cipherText.length === 0) {
      return res.status(400).json({ message: "cipherText обов'язковий" });
    }
    if (cipherText.length > MAX_CIPHERTEXT_LENGTH) {
      return res.status(400).json({ message: "Запис занадто великий" });
    }

    const entryDate = normalizeDate(date);

    const entry = await prisma.diaryEntry.upsert({
      where: {
        userId_date: { userId: req.dbUser.id, date: entryDate },
      },
      update: { cipherText },
      create: {
        userId: req.dbUser.id,
        date: entryDate,
        cipherText,
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error("❌ Помилка збереження запису щоденника:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// GET /api/diary/mine — усі зашифровані записи поточного користувача.
// Розшифровка відбувається виключно на клієнті ключем, якого сервер не має.
exports.getMyEntries = async (req, res) => {
  try {
    const entries = await prisma.diaryEntry.findMany({
      where: { userId: req.dbUser.id },
      orderBy: { date: "asc" },
    });
    res.status(200).json(entries);
  } catch (error) {
    console.error("❌ Помилка отримання щоденника:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
