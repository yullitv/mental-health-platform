const { getGeminiClient } = require("../utils/geminiClient");

const MODEL = "gemini-3.7-flash";

// ВАЖЛИВО: crisisDetected — це єдине, чому довіряємо AI щодо безпеки.
// Номери телефонів AI НІКОЛИ не генерує сам (ризик галюцинації) — вони
// захардкоджені й перевірені на фронтенді (CRISIS_RESOURCES).
const SYSTEM_INSTRUCTION = `Ти — інструмент когнітивної реструктуризації (техніка з КПТ), вбудований у застосунок психологічної підтримки "Опора". Твоє завдання — допомогти користувачу розібрати ОДНУ автоматичну негативну думку на складові.

СУВОРІ ПРАВИЛА:
- Ти НЕ психотерапевт і НЕ ставиш діагнози. Ніколи не пиши фрази на кшталт "у вас депресія" чи "це схоже на тривожний розлад".
- Не признач ліки і не давай медичних порад.
- "fact" — нейтральний, перевірюваний факт із опису користувача, без оцінних суджень.
- "interpretation" — думка користувача, перефразована без спотворення сенсу.
- "prediction" — те, чого користувач боїться або очікує в результаті.
- "alternatives" — рівно 3 короткі альтернативні пояснення ситуації, які користувач міг не врахувати.
- "reflectionQuestion" — одне м'яке відкрите питання для подальшої рефлексії.
- "crisisDetected" — постав true, ЯКЩО в тексті користувача є хоч натяк на думки про самоушкодження, суїцид, намір нашкодити собі чи іншим, або опис безпосередньої небезпеки для життя. В усіх інших випадках (звичайний стрес, сум, тривога, конфлікти, розчарування) — false.
- Якщо crisisDetected true: заповни fact/interpretation/prediction порожніми рядками, alternatives — порожнім масивом, а в reflectionQuestion напиши тепле, некатегоричне повідомлення, яке визнає біль користувача і м'яко каже, що зараз краще звернутися по допомогу до людини, а не продовжувати цю вправу. НІКОЛИ не вигадуй номери телефонів чи назви організацій — застосунок сам покаже перевірені контакти.
- Пиши українською мовою, теплим, підтримуючим, не повчальним тоном.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    crisisDetected: { type: "boolean" },
    fact: { type: "string" },
    interpretation: { type: "string" },
    prediction: { type: "string" },
    alternatives: {
      type: "array",
      items: { type: "string" },
    },
    reflectionQuestion: { type: "string" },
  },
  required: [
    "crisisDetected",
    "fact",
    "interpretation",
    "prediction",
    "alternatives",
    "reflectionQuestion",
  ],
};

exports.analyzeThought = async (req, res) => {
  try {
    const { situation, thought } = req.body;

    if (
      !situation ||
      !thought ||
      typeof situation !== "string" ||
      typeof thought !== "string"
    ) {
      return res.status(400).json({ message: "situation і thought обов'язкові" });
    }
    if (situation.length > 1000 || thought.length > 500) {
      return res.status(400).json({ message: "Текст занадто довгий" });
    }

    const client = getGeminiClient();

    const interaction = await client.interactions.create({
      model: MODEL,
      input: `Ситуація: ${situation}\n\nАвтоматична думка: ${thought}`,
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
    console.error("❌ Помилка аналізу думки:", error);
    res
      .status(500)
      .json({ message: "Не вдалось виконати аналіз. Спробуй ще раз пізніше." });
  }
};
