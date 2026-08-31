const prisma = require("../prisma");
const { getGeminiClient } = require("../utils/geminiClient");

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

const REFLECTION_MODEL = "gemini-3.7-flash";

const REFLECTION_SYSTEM_INSTRUCTION = `Ти — інструмент рефлексії для щоденника настрою в застосунку психологічної підтримки "Опора".
Тобі надають розшифровані записи користувача за останній тиждень: числові оцінки (настрій, енергія, тривожність, стрес, фізичний стан за шкалою 1-5), години сну, короткі нотатки про день.

Твоє завдання — написати ОДИН короткий (3-5 речень), теплий, підтримуючий абзац українською мовою, який:
- підсумовує загальний стан за тиждень людяно, а не сухою статистикою;
- може згадати 1-2 помітні теми з нотаток (наприклад, втома, стосунки, навчання), якщо вони справді повторюються в даних;
- якщо є помітний зв'язок між подіями/сном і самопочуттям — може обережно це відзначити, вживаючи "могло вплинути", "здається", а не стверджувальний тон;
- закінчується м'якою підтримуючою фразою, без порад медичного характеру.

СУВОРО ЗАБОРОНЕНО:
- ставити будь-які психологічні чи медичні діагнози ("тривожний розлад", "депресія" тощо) або натякати на них;
- давати конкретні медичні рекомендації чи згадувати ліки;
- вигадувати факти, яких немає в наданих даних;
- згадувати номери телефонів чи служби підтримки.

Звертайся на "ти". Якщо дані виглядають тривожно (згадки про безнадію, бажання зникнути тощо) — НЕ став діагноз і не сип порадами, а м'яко відзнач, що тиждень був важким і що поруч є підтримка, без деталізації.`;

function numOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// POST /api/diary/weekly-reflection
//
// ВАЖЛИВО: це єдине місце у щоденнику, де сервер тимчасово бачить
// розшифрований текст. Це відбувається лише за явною згодою користувача
// (кнопка "Так, згенерувати" у клієнті) для одного запиту за раз — дані
// не зберігаються в БД і використовуються тільки для цього виклику AI.
exports.generateWeeklyReflection = async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: "entries обов'язкові" });
    }
    if (entries.length > 14) {
      return res.status(400).json({ message: "Забагато записів за раз" });
    }

    const safeEntries = entries.slice(0, 14).map((e) => ({
      date: typeof e.date === "string" ? e.date.slice(0, 10) : null,
      mood: numOrNull(e.mood),
      physicalState: numOrNull(e.physicalState),
      energy: numOrNull(e.energy),
      anxiety: numOrNull(e.anxiety),
      stress: numOrNull(e.stress),
      sleepHours: numOrNull(e.sleepHours),
      note: typeof e.note === "string" ? e.note.slice(0, 500) : null,
    }));

    const client = getGeminiClient();
    const interaction = await client.interactions.create({
      model: REFLECTION_MODEL,
      input: `Записи за тиждень (у хронологічному порядку):\n${JSON.stringify(safeEntries, null, 2)}`,
      system_instruction: REFLECTION_SYSTEM_INSTRUCTION,
    });

    res.status(200).json({ reflection: interaction.output_text });
  } catch (error) {
    console.error("❌ Помилка генерації рефлексії щоденника:", error);
    res
      .status(500)
      .json({ message: "Не вдалось згенерувати рефлексію. Спробуй пізніше." });
  }
};
