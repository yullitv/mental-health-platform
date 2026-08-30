const prisma = require("../prisma");

function normalizeDate(input) {
  const d = input ? new Date(input) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// POST /api/diary — записати (або оновити) запис за день
exports.upsertEntry = async (req, res) => {
  try {
    const { date, mood, physicalState, sleepHours, note } = req.body;

    const moodNum = Number(mood);
    const physicalStateNum = Number(physicalState);

    if (
      !Number.isInteger(moodNum) ||
      moodNum < 1 ||
      moodNum > 5 ||
      !Number.isInteger(physicalStateNum) ||
      physicalStateNum < 1 ||
      physicalStateNum > 5
    ) {
      return res.status(400).json({
        message: "mood і physicalState мають бути цілими числами від 1 до 5",
      });
    }

    const entryDate = normalizeDate(date);

    const entry = await prisma.diaryEntry.upsert({
      where: {
        userId_date: { userId: req.dbUser.id, date: entryDate },
      },
      update: {
        mood: moodNum,
        physicalState: physicalStateNum,
        sleepHours: sleepHours !== undefined ? Number(sleepHours) : null,
        note: note || null,
      },
      create: {
        userId: req.dbUser.id,
        date: entryDate,
        mood: moodNum,
        physicalState: physicalStateNum,
        sleepHours: sleepHours !== undefined ? Number(sleepHours) : null,
        note: note || null,
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error("❌ Помилка збереження запису щоденника:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// GET /api/diary/mine — усі записи поточного користувача
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