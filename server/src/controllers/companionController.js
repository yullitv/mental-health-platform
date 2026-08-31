const { getGeminiClient } = require("../utils/geminiClient");

const MODEL = "gemini-3.7-flash";

const MAX_MESSAGES = 20;
const MAX_TEXT_LENGTH = 800;
const MAX_TRANSCRIPT_LENGTH = 8000;
const MAX_DIARY_CONTEXT_LENGTH = 4000;

// ВАЖЛИВО (як і в thoughtAnalysisController): crisisDetected — єдине, чому
// довіряємо AI щодо безпеки. Номери телефонів AI НІКОЛИ не генерує сам —
// вони захардкоджені й перевірені на фронтенді (CRISIS_RESOURCES).
const SYSTEM_INSTRUCTION = `Ти — теплий, підтримуючий співрозмовник у застосунку психологічної підтримки "Опора". Твоя роль — вислухати, поставити уточнювальне питання, віддзеркалити почуття людини й м'яко підтримати. Це ВІЛЬНА розмова, а не структурована вправа.

СУВОРІ ПРАВИЛА:
- Ти НЕ психотерапевт і НЕ ставиш діагнози. Ніколи не пиши фрази на кшталт "у вас депресія" чи "це тривожний розлад".
- Не признач ліки і не давай медичних порад.
- Відповідай КОРОТКО (2-5 речень) — це діалог, а не лекція.
- Став щонайбільше одне уточнювальне питання за раз, і лише якщо це доречно.
- Якщо в повідомленні наведено "Контекст із щоденника користувача" — можеш спиратись на нього, ЯКЩО це релевантно поточній темі розмови, але ніколи не вигадуй деталей, яких там немає, і не нав'язуй його, якщо людина говорить про щось інше.
- "crisisDetected" — постав true, ЯКЩО в ОСТАННЬОМУ повідомленні користувача (не в попередніх) є хоч натяк на думки про самоушкодження, суїцид, намір нашкодити собі чи іншим, або опис безпосередньої небезпеки для життя. В усіх інших випадках — false.
- Якщо crisisDetected true: у "reply" напиши тепле, некатегоричне повідомлення, яке визнає біль людини і м'яко каже, що зараз краще звернутися по допомогу до людини, а не продовжувати розмову з AI. НІКОЛИ не вигадуй номери телефонів чи назви організацій — застосунок сам покаже перевірені контакти.
- Пиши українською мовою.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    crisisDetected: { type: "boolean" },
    reply: { type: "string" },
  },
  required: ["crisisDetected", "reply"],
};

function buildTranscript(messages) {
  return messages
    .map((m) => `${m.role === "user" ? "Людина" : "Асистент"}: ${m.text}`)
    .join("\n");
}

// POST /api/companion/message — вільна підтримуюча розмова з AI. Стан
// розмови НЕ зберігається на сервері (як і в аналізі думки): клієнт
// щоразу надсилає всю історію повідомлень, сервер лише формує ОДНУ
// відповідь на основі неї. Контекст щоденника — опційний, і якщо клієнт
// його передає, то це вже РОЗШИФРОВАНИЙ на клієнті текст (свідомий вихід
// за межі E2EE, на який людина явно погодилась в інтерфейсі).
exports.sendMessage = async (req, res) => {
  try {
    const { messages, diaryContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages обов'язкові" });
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ message: "Забагато повідомлень за раз" });
    }
    for (const m of messages) {
      if (
        !m ||
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.text !== "string" ||
        m.text.length === 0 ||
        m.text.length > MAX_TEXT_LENGTH
      ) {
        return res.status(400).json({ message: "Некоректне повідомлення" });
      }
    }
    if (messages[messages.length - 1].role !== "user") {
      return res
        .status(400)
        .json({ message: "Останнє повідомлення має бути від користувача" });
    }

    const transcript = buildTranscript(messages);
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return res.status(400).json({
        message: "Розмова занадто довга — онови сторінку і почни заново",
      });
    }

    let promptInput = transcript;
    if (typeof diaryContext === "string" && diaryContext.length > 0) {
      const safeDiaryContext = diaryContext.slice(0, MAX_DIARY_CONTEXT_LENGTH);
      promptInput = `Контекст із щоденника користувача (останні записи):\n${safeDiaryContext}\n\n---\n\nІсторія розмови:\n${transcript}`;
    }

    const client = getGeminiClient();
    const interaction = await client.interactions.create({
      model: MODEL,
      input: promptInput,
      system_instruction: SYSTEM_INSTRUCTION,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: RESPONSE_SCHEMA,
      },
    });

    const parsed = JSON.parse(interaction.output_text);
    res.status(200).json(parsed);
  } catch (error) {
    console.error("❌ Помилка розмови з AI-співрозмовником:", error);
    res
      .status(500)
      .json({ message: "Не вдалось отримати відповідь. Спробуй ще раз пізніше." });
  }
};
