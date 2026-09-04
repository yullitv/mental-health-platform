const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const prisma = require("../prisma");
const { createNotification } = require("../utils/notificationHelper");
const { getGeminiClient } = require("../utils/geminiClient");
const { fetchJarStatement } = require("../utils/monobankClient");
const { getPaymentCode } = require("../utils/paymentCode");

const DONATION_SCREENING_MODEL = "gemini-3.7-flash";

// AI НЕ приймає рішення про підтвердження донату — лише готує підказку для
// того, хто буде дивитись (спеціаліст/адмін). Той самий безпековий принцип,
// що й у верифікації спеціалістів: людина завжди вирішує сама.
const DONATION_SCREENING_SYSTEM_INSTRUCTION = `Ти — асистент попереднього скринінгу підтверджень донату для платформи психологічної підтримки "Опора". Клієнт надсилає скріншот банківського переказу як доказ донату в благодійний фонд перед сесією. Твоє завдання — ДОПОМОГТИ людині, яка перевіряє донат, а не замінити її рішення.

СУВОРІ ПРАВИЛА:
- Ти НІКОЛИ не приймаєш остаточне рішення про підтвердження чи відхилення донату — лише готуєш підказку.
- "readable" — false, якщо зображення розмите, обрізане, це взагалі не квитанція/скрін переказу, або текст неможливо розібрати.
- "recipientFound"/"extractedRecipient" — ім'я/назва одержувача переказу (людина, банка, організація), яку видно на скріні. Якщо не видно — recipientFound: false, extractedRecipient: "".
- "recipientMatches" — true, ТІЛЬКИ якщо одержувач на скріні по суті є тим самим фондом/банкою, що названий у тексті запиту (назва може бути сформульована трохи інакше — це нормально, головне щоб це була та сама банка/фонд, а не явно інша людина чи інший збір). Якщо одержувач — конкретна людина (ім'я+прізвище, не пов'язані з фондом) або явно інший фонд, або одержувача взагалі не видно — false.
- "amountFound"/"extractedAmount" — сума переказу в гривнях, яку видно на скріні. Якщо сума не видна — amountFound: false, extractedAmount: 0.
- "referenceFound"/"extractedReference" — номер транзакції/квитанції/референс, якщо він видний на скріні. Якщо немає — referenceFound: false, extractedReference: "".
- "looksAuthentic" — став false ЛИШЕ якщо бачиш конкретну візуальну ознаку редагування (різні шрифти в межах одного рядка, зміщені чи розмиті елементи інтерфейсу навколо цифр, невідповідна компресія ділянки зображення). Це не судова експертиза — не став false просто через загальну підозру без конкретної ознаки.
- "notes" — 1-2 короткі речення українською: що побачив, на що звернути увагу. Без категоричних тверджень на кшталт "переказ справжній" — ти не можеш це підтвердити.`;

const DONATION_SCREENING_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    readable: { type: "boolean" },
    recipientFound: { type: "boolean" },
    extractedRecipient: { type: "string" },
    recipientMatches: { type: "boolean" },
    amountFound: { type: "boolean" },
    extractedAmount: { type: "number" },
    referenceFound: { type: "boolean" },
    extractedReference: { type: "string" },
    looksAuthentic: { type: "boolean" },
    notes: { type: "string" },
  },
  required: [
    "readable",
    "recipientFound",
    "extractedRecipient",
    "recipientMatches",
    "amountFound",
    "extractedAmount",
    "referenceFound",
    "extractedReference",
    "looksAuthentic",
    "notes",
  ],
};

function mimeFromExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".pdf") return "application/pdf";
  return "image/jpeg";
}

async function screenDonationProof(filePath, claimedAmount, fundraiserName) {
  const mimeType = mimeFromExt(filePath);
  const data = fs.readFileSync(filePath).toString("base64");

  const contentPart =
    mimeType === "application/pdf"
      ? { type: "document", data, mime_type: mimeType }
      : { type: "image", data, mime_type: mimeType };

  const client = getGeminiClient();
  const interaction = await client.interactions.create({
    model: DONATION_SCREENING_MODEL,
    input: [
      {
        type: "text",
        text: `Клієнт заявив суму донату: ${claimedAmount} грн, фонд: "${fundraiserName}". Проаналізуй прикріплений скрін підтвердження переказу.`,
      },
      contentPart,
    ],
    system_instruction: DONATION_SCREENING_SYSTEM_INSTRUCTION,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: DONATION_SCREENING_RESPONSE_SCHEMA,
    },
  });

  return JSON.parse(interaction.output_text);
}

// Незалежна від AI перевірка через реальну виписку банки Monobank —
// працює лише якщо у фонду вказано monobankJarId. Набагато надійніший
// сигнал за читання скріна, бо це справжні дані транзакції, а не OCR.
// Викликається двічі за життя донату: одразу при подачі заяви (без скріна)
// і повторно, коли клієнт довантажує скрін — переказ міг з'явитись у
// виписці не одразу.
async function checkBankConfirmation(fundraiser, session, sessionId, claimedAmount) {
  if (!fundraiser.monobankJarId) {
    return { bankConfirmed: false, bankTransactionId: null };
  }

  try {
    const to = new Date();
    const from = new Date(session.createdAt);
    from.setDate(from.getDate() - 1); // невеликий запас до створення сесії

    const statement = await fetchJarStatement(fundraiser.monobankJarId, from, to);
    const amountKopecks = Math.round(claimedAmount * 100);
    const tolerance = 100; // ±1 грн

    const usedTransactions = await prisma.donation.findMany({
      where: { bankTransactionId: { not: null } },
      select: { bankTransactionId: true },
    });
    const usedIds = new Set(usedTransactions.map((d) => d.bankTransactionId));

    // Усі перекази з правильною сумою, які ще не "витрачені" на інший донат.
    const candidates = statement.filter(
      (tx) =>
        tx.amount > 0 &&
        Math.abs(tx.amount - amountKopecks) <= tolerance &&
        !usedIds.has(tx.id)
    );

    // Код сесії (client/src/utils/paymentCode.js), який клієнту пропонується
    // вписати в коментар до переказу — щоб не переплутати двох клієнтів,
    // які донатять однакову суму приблизно в той самий час. ПРИМІТКА: точну
    // назву поля з текстом коментаря у відповіді Monobank Statement API ще
    // не звірено на реальній транзакції — перевіряємо і "description", і
    // "comment" про всяк випадок.
    const paymentCode = getPaymentCode(sessionId);
    const txText = (tx) => `${tx.description || ""} ${tx.comment || ""}`.toUpperCase();
    const codeMatch = candidates.find((tx) => txText(tx).includes(paymentCode));

    let match = null;
    if (codeMatch) {
      // Код у коментарі — однозначний збіг, навіть якщо кандидатів кілька.
      match = codeMatch;
    } else if (candidates.length === 1) {
      // Без коду підтверджуємо автоматично лише якщо кандидат за сумою
      // рівно один — якщо їх кілька, вгадати правильний неможливо, і
      // краще лишити на ручну перевірку, ніж переплутати клієнтів.
      match = candidates[0];
    }

    if (match) {
      return { bankConfirmed: true, bankTransactionId: match.id };
    }
    return { bankConfirmed: false, bankTransactionId: null };
  } catch (bankError) {
    console.error(
      "⚠️ Перевірка через Monobank API не вдалась (донат все одно подаємо):",
      bankError
    );
    return { bankConfirmed: false, bankTransactionId: null };
  }
}

// POST /api/donations — клієнт заявляє донат для своєї сесії. Скрін НЕ
// потрібен одразу: спершу пробуємо підтвердити донат автоматично через
// реальну виписку банки (checkBankConfirmation). Якщо вдалось — донат і
// сесія одразу CONFIRMED, без участі людини. Якщо ні — донат лишається
// PENDING, і клієнту показують запасний варіант: довантажити скрін для
// ручної перевірки (PUT /api/donations/:id/proof).
exports.createDonation = async (req, res) => {
  try {
    const { sessionId, fundraiserId, amount } = req.body;

    if (!sessionId || !fundraiserId) {
      return res.status(400).json({
        message: "Поля 'sessionId' та 'fundraiserId' обов'язкові",
      });
    }

    if (amount === undefined || amount === null || amount === "" || Number(amount) <= 0) {
      return res.status(400).json({ message: "Вкажи суму донату" });
    }
    const claimedAmount = Number(amount);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return res.status(404).json({ message: "Сесію не знайдено" });
    }
    if (session.clientId !== req.dbUser.id) {
      return res.status(403).json({ message: "Це не ваша сесія" });
    }
    if (session.status !== "CREATED" && session.status !== "PENDING_DONATION") {
      return res
        .status(409)
        .json({ message: "Для цієї сесії донат вже не можна подати" });
    }

    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id: fundraiserId },
    });
    if (!fundraiser || !fundraiser.isActive) {
      return res
        .status(404)
        .json({ message: "Фонд не знайдено або він неактивний" });
    }

    const { bankConfirmed, bankTransactionId } = await checkBankConfirmation(
      fundraiser,
      session,
      sessionId,
      claimedAmount
    );

    const donationData = {
      sessionId,
      fundraiserId,
      amount: claimedAmount,
      status: bankConfirmed ? "CONFIRMED" : "PENDING",
      bankConfirmed,
      bankTransactionId,
    };
    if (bankConfirmed) {
      donationData.confirmedAt = new Date();
    }

    const [donation] = await prisma.$transaction([
      prisma.donation.create({ data: donationData }),
      prisma.session.update({
        where: { id: sessionId },
        data: {
          status: bankConfirmed ? "CONFIRMED" : "PENDING_DONATION",
          fundraiserId,
        },
      }),
    ]);

    if (bankConfirmed) {
      await createNotification({
        userId: session.clientId,
        type: "DONATION_CONFIRMED",
        title: "Донат підтверджено",
        message: "Банк автоматично підтвердив переказ — сесію підтверджено, очікуй на зустріч.",
        link: `/dashboard`,
      });

      const specialistProfile = await prisma.specialistProfile.findUnique({
        where: { id: session.specialistId },
      });
      if (specialistProfile) {
        await createNotification({
          userId: specialistProfile.userId,
          type: "DONATION_CONFIRMED",
          title: "Сесію підтверджено автоматично",
          message:
            "Донат клієнта підтвердив банк — сесія зʼявилась у розкладі, нічого робити не треба.",
          link: `/dashboard`,
        });
      }
    } else {
      const specialistProfile = await prisma.specialistProfile.findUnique({
        where: { id: session.specialistId },
      });
      if (specialistProfile) {
        await createNotification({
          userId: specialistProfile.userId,
          type: "DONATION_SUBMITTED",
          title: "Клієнт заявив донат",
          message: `Клієнт заявив донат на суму ${claimedAmount} грн — банк поки не підтвердив автоматично, очікуємо скрін для перевірки.`,
          link: `/dashboard`,
        });
      }
    }

    res.status(201).json(donation);
  } catch (error) {
    console.error("❌ Помилка створення донату:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// PUT /api/donations/:id/proof — запасний варіант: клієнт довантажує скрін
// для донату, який банк не підтвердив автоматично одразу. Тут-таки ще раз
// пробуємо звірити з банком (переказ міг з'явитись у виписці пізніше) —
// якщо вдалось, донат підтверджується автоматично й без AI; якщо ні, скрін
// проходить AI-скринінг і лишається на ручну перевірку спеціаліста/адміна.
exports.attachDonationProof = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "Додай файл підтвердження" });
    }

    const donation = await prisma.donation.findUnique({
      where: { id },
      include: { session: true, fundraiser: true },
    });

    if (!donation) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Донат не знайдено" });
    }
    if (donation.session.clientId !== req.dbUser.id) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ message: "Це не ваш донат" });
    }
    if (donation.status !== "PENDING") {
      fs.unlink(req.file.path, () => {});
      return res.status(409).json({ message: "Цей донат вже опрацьовано" });
    }
    if (donation.proofUrl) {
      fs.unlink(req.file.path, () => {});
      return res.status(409).json({ message: "Скрін для цього донату вже додано" });
    }

    const proofUrl = `/uploads/donations/${req.file.filename}`;
    const proofHash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(req.file.path))
      .digest("hex");

    // Той самий жорсткий захист, що й раніше — той самий файл не можна
    // використати повторно для іншого донату.
    const existingByHash = await prisma.donation.findUnique({
      where: { proofHash },
    });
    if (existingByHash) {
      fs.unlink(req.file.path, () => {});
      return res.status(409).json({
        message: "Цей файл підтвердження вже використовувався для іншого донату",
      });
    }

    // Повторна спроба звірки з банком — переказ міг з'явитись у виписці
    // вже після початкової подачі заяви на донат.
    const { bankConfirmed, bankTransactionId } = await checkBankConfirmation(
      donation.fundraiser,
      donation.session,
      donation.sessionId,
      donation.amount
    );

    // AI-скринінг скріна — підказка для людини, якщо банк все ще не підтвердив.
    let extractedAmount = null;
    let extractedReference = null;
    let extractedRecipient = null;
    let aiScreeningStatus = null;
    let aiScreeningNotes = null;
    let aiScreenedAt = null;

    try {
      const result = await screenDonationProof(
        req.file.path,
        donation.amount,
        donation.fundraiser.name
      );
      aiScreenedAt = new Date();
      aiScreeningNotes = result.notes;
      extractedAmount = result.amountFound ? result.extractedAmount : null;
      extractedReference =
        result.referenceFound && result.extractedReference ? result.extractedReference : null;
      extractedRecipient =
        result.recipientFound && result.extractedRecipient ? result.extractedRecipient : null;

      if (!result.readable) {
        aiScreeningStatus = "UNREADABLE";
      }

      if (!aiScreeningStatus && result.recipientFound && !result.recipientMatches) {
        aiScreeningStatus = "RECIPIENT_MISMATCH";
      }

      if (!aiScreeningStatus && extractedReference) {
        const duplicateRef = await prisma.donation.findFirst({
          where: { extractedReference, id: { not: donation.id } },
        });
        if (duplicateRef) {
          aiScreeningStatus = "DUPLICATE_REFERENCE";
        }
      }

      if (
        !aiScreeningStatus &&
        result.amountFound &&
        Math.abs(result.extractedAmount - donation.amount) > 1
      ) {
        aiScreeningStatus = "AMOUNT_MISMATCH";
      }

      if (!aiScreeningStatus && !result.looksAuthentic) {
        aiScreeningStatus = "SUSPICIOUS";
      }

      if (!aiScreeningStatus) {
        aiScreeningStatus = "OK";
      }
    } catch (aiError) {
      console.error("⚠️ AI-скринінг донату не вдався (скрін все одно додаємо):", aiError);
    }

    const updateData = {
      proofUrl,
      proofHash,
      extractedAmount,
      extractedReference,
      extractedRecipient,
      aiScreeningStatus,
      aiScreeningNotes,
      aiScreenedAt,
      bankConfirmed,
      bankTransactionId,
    };
    if (bankConfirmed) {
      updateData.status = "CONFIRMED";
      updateData.confirmedAt = new Date();
    }

    const ops = [prisma.donation.update({ where: { id }, data: updateData })];
    if (bankConfirmed) {
      ops.push(
        prisma.session.update({
          where: { id: donation.sessionId },
          data: { status: "CONFIRMED" },
        })
      );
    }
    const [updatedDonation] = await prisma.$transaction(ops);

    if (bankConfirmed) {
      await createNotification({
        userId: donation.session.clientId,
        type: "DONATION_CONFIRMED",
        title: "Донат підтверджено",
        message: "Банк підтвердив переказ — сесію підтверджено, очікуй на зустріч.",
        link: `/dashboard`,
      });
    } else {
      const specialistProfile = await prisma.specialistProfile.findUnique({
        where: { id: donation.session.specialistId },
      });
      if (specialistProfile) {
        await createNotification({
          userId: specialistProfile.userId,
          type: "DONATION_SUBMITTED",
          title: "Донат очікує підтвердження",
          message: `Клієнт додав скрін підтвердження донату на суму ${donation.amount} грн`,
          link: `/dashboard`,
        });
      }
    }

    res.status(200).json(updatedDonation);
  } catch (error) {
    console.error("❌ Помилка додавання скріна донату:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// GET /api/donations/pending — список донатів, що очікують підтвердження
exports.getPendingDonations = async (req, res) => {
  try {
    const user = req.dbUser;
    const where = { status: "PENDING" };

    if (user.role === "SPECIALIST") {
      const profile = await prisma.specialistProfile.findUnique({
        where: { userId: user.id },
      });
      if (!profile) {
        return res
          .status(404)
          .json({ message: "Профіль спеціаліста не знайдено" });
      }
      where.session = { specialistId: profile.id };
    }
    // ADMIN бачить усі PENDING донати без додаткового фільтра

    const donations = await prisma.donation.findMany({
      where,
      include: {
        session: {
          include: {
            client: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        fundraiser: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json(donations);
  } catch (error) {
    console.error("❌ Помилка отримання донатів:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Спільна перевірка доступу для confirm/reject
const resolveDonationAccess = async (donationId, user) => {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: { session: true },
  });

  if (!donation) {
    return { error: { status: 404, message: "Донат не знайдено" } };
  }

  if (user.role === "SPECIALIST") {
    const profile = await prisma.specialistProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile || donation.session.specialistId !== profile.id) {
      return { error: { status: 403, message: "Це не ваша сесія" } };
    }
  }
  // ADMIN має доступ до всього

  if (donation.status !== "PENDING") {
    return { error: { status: 409, message: "Цей донат вже опрацьовано" } };
  }

  return { donation };
};

// PUT /api/donations/:id/confirm — підтвердження донату
exports.confirmDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { donation, error } = await resolveDonationAccess(id, req.dbUser);
    if (error) return res.status(error.status).json({ message: error.message });

    const [updatedDonation] = await prisma.$transaction([
      prisma.donation.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedById: req.dbUser.id,
          confirmedAt: new Date(),
        },
      }),
      prisma.session.update({
        where: { id: donation.sessionId },
        data: { status: "CONFIRMED" },
      }),
    ]);

    await createNotification({
      userId: donation.session.clientId,
      type: "DONATION_CONFIRMED",
      title: "Донат підтверджено",
      message: "Вашу сесію підтверджено — очікуйте на зустріч.",
      link: `/dashboard`,
    });

    res.status(200).json(updatedDonation);
  } catch (error) {
    console.error("❌ Помилка підтвердження донату:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// PUT /api/donations/:id/reject — відхилення донату
exports.rejectDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { donation, error } = await resolveDonationAccess(id, req.dbUser);
    if (error) return res.status(error.status).json({ message: error.message });

    const [updatedDonation] = await prisma.$transaction([
      prisma.donation.update({
        where: { id },
        data: {
          status: "REJECTED",
          confirmedById: req.dbUser.id,
          confirmedAt: new Date(),
        },
      }),
      prisma.session.update({
        where: { id: donation.sessionId },
        data: { status: "CREATED" },
      }),
    ]);

    await createNotification({
      userId: donation.session.clientId,
      type: "DONATION_REJECTED",
      title: "Донат відхилено",
      message: "Ваше підтвердження донату відхилено. Спробуйте подати знову.",
      link: `/dashboard`,
    });

    res.status(200).json(updatedDonation);
  } catch (error) {
    console.error("❌ Помилка відхилення донату:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
