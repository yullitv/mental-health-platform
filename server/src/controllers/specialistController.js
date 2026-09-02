const prisma = require('../prisma');
const fs = require('fs');
const path = require('path');
const { getGeminiClient } = require('../utils/geminiClient');

// GET /api/specialists — публічний список підтверджених спеціалістів.
// Фільтр по user.role — захист від "осиротілого" SpecialistProfile: якщо
// комусь вручну змінили роль з SPECIALIST на іншу (наприклад, у Prisma
// Studio), стара анкета не повинна лишатись видимою як публічний спеціаліст.
exports.getApprovedSpecialists = async (req, res) => {
  try {
    const specialists = await prisma.specialistProfile.findMany({
      where: { verificationStatus: 'APPROVED', user: { role: 'SPECIALIST' } },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
    res.status(200).json(specialists);
  } catch (error) {
    console.error('❌ Помилка отримання спеціалістів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/specialists/pending — ADMIN: профілі, що очікують підтвердження.
// Той самий захист від "осиротілого" профілю — не показуємо в черзі когось,
// хто вже не має ролі SPECIALIST.
exports.getPendingSpecialists = async (req, res) => {
  try {
    const specialists = await prisma.specialistProfile.findMany({
      where: { verificationStatus: 'PENDING', user: { role: 'SPECIALIST' } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    res.status(200).json(specialists);
  } catch (error) {
    console.error('❌ Помилка отримання заявок:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// Ці поля — саме те, що адмін перевіряв, коли підтверджував заявку. Якщо
// підтверджений спеціаліст їх міняє, старе підтвердження вже не відповідає
// дійсності — повертаємо заявку на повторний розгляд, а не залишаємо
// "Підтверджено" на публічній картці для когось, кого адмін ще не бачив.
function verificationDataChanged(profile, fields) {
  const normalizedGraduationYear =
    fields.graduationYear !== undefined
      ? fields.graduationYear
        ? Number(fields.graduationYear)
        : null
      : undefined;

  return (
    (fields.fullLegalName !== undefined && fields.fullLegalName !== profile.fullLegalName) ||
    (fields.licenseNumber !== undefined && fields.licenseNumber !== profile.licenseNumber) ||
    (fields.issuingInstitution !== undefined &&
      fields.issuingInstitution !== profile.issuingInstitution) ||
    (normalizedGraduationYear !== undefined &&
      normalizedGraduationYear !== profile.graduationYear)
  );
}

// PUT /api/specialists/me — спеціаліст редагує власний профіль
exports.updateMyProfile = async (req, res) => {
  try {
    const {
      bio,
      specializations,
      hourlyRate,
      documentsUrl,
      experience,
      fullLegalName,
      licenseNumber,
      issuingInstitution,
      graduationYear,
    } = req.body;

    const profile = await prisma.specialistProfile.findUnique({
      where: { userId: req.dbUser.id },
    });
    if (!profile) {
      return res.status(404).json({ message: 'Профіль спеціаліста не знайдено' });
    }

    const resetToPending =
      profile.verificationStatus === 'APPROVED' &&
      verificationDataChanged(profile, {
        fullLegalName,
        licenseNumber,
        issuingInstitution,
        graduationYear,
      });

    const updated = await prisma.specialistProfile.update({
      where: { userId: req.dbUser.id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(specializations !== undefined && { specializations }),
        ...(hourlyRate !== undefined && {
          hourlyRate: hourlyRate === null || hourlyRate === '' ? null : Number(hourlyRate),
        }),
        ...(documentsUrl !== undefined && { documentsUrl }),
        ...(experience !== undefined && { experience }),
        ...(fullLegalName !== undefined && { fullLegalName }),
        ...(licenseNumber !== undefined && { licenseNumber }),
        ...(issuingInstitution !== undefined && { issuingInstitution }),
        ...(graduationYear !== undefined && {
          graduationYear: graduationYear ? Number(graduationYear) : null,
        }),
        ...(resetToPending && { verificationStatus: 'PENDING' }),
      },
    });

    res.status(200).json({ ...updated, verificationResetToPending: resetToPending });
  } catch (error) {
    console.error('❌ Помилка оновлення профілю:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// PUT /api/specialists/:id/verify — ADMIN підтверджує або відхиляє профіль
exports.verifySpecialist = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return res.status(400).json({ message: "status має бути 'APPROVED' або 'REJECTED'" });
    }

    const updated = await prisma.specialistProfile.update({
      where: { id },
      data: { verificationStatus: status },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Помилка підтвердження спеціаліста:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/specialists/:id — публічна картка одного спеціаліста
exports.getSpecialistById = async (req, res) => {
  try {
    const { id } = req.params;
    const specialist = await prisma.specialistProfile.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    if (!specialist || specialist.user.role !== 'SPECIALIST') {
      return res.status(404).json({ message: 'Спеціаліста не знайдено' });
    }
    delete specialist.user.role;

    res.status(200).json(specialist);
  } catch (error) {
    console.error('❌ Помилка отримання спеціаліста:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};
// GET /api/specialists/me — власний профіль спеціаліста
exports.getMyProfile = async (req, res) => {
  try {
    const profile = await prisma.specialistProfile.findUnique({
      where: { userId: req.dbUser.id },
    });
    if (!profile) {
      return res.status(404).json({ message: 'Профіль спеціаліста не знайдено' });
    }
    res.status(200).json(profile);
  } catch (error) {
    console.error('❌ Помилка отримання власного профілю:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

const SCREENING_MODEL = 'gemini-3.7-flash';

// AI НЕ приймає рішення про верифікацію — лише готує підказку для адміна.
// Той самий безпековий принцип, що й у crisisDetected: людина завжди
// вирішує сама, AI тільки допомагає їй швидше й уважніше прочитати заявку.
const SCREENING_SYSTEM_INSTRUCTION = `Ти — асистент попереднього скринінгу документів для платформи психологічної підтримки "Опора". Твоє завдання — подивитись на завантажений документ (диплом, сертифікат чи ліцензію спеціаліста) і ДОПОМОГТИ адміністратору-людині, а не замінити його рішення.

СУВОРІ ПРАВИЛА:
- Ти НІКОЛИ не приймаєш остаточне рішення про підтвердження чи відхилення — лише даєш попередній висновок.
- "readable" — false, якщо документ розмитий, обрізаний, не документ взагалі, або текст неможливо розібрати.
- "nameMatches" — true, ЛИШЕ якщо ім'я на документі текстово збігається (з урахуванням відмінків/транслітерації) із заявленим ПІБ. Якщо документ нечитабельний або імені немає — false.
- "relevantField" — true, якщо документ виглядає як диплом/сертифікат/ліцензія у сфері психології, психотерапії, консультування чи суміжній. Інакше false.
- "extractedName", "extractedInstitution" — те, що вдалось розпізнати з документа (порожній рядок, якщо не вдалось).
- "notes" — 1-2 короткі речення українською для адміна: що саме побачив, на що звернути увагу. Без категоричних висновків на кшталт "документ справжній" — ти не можеш це підтвердити.`;

const SCREENING_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    readable: { type: 'boolean' },
    nameMatches: { type: 'boolean' },
    relevantField: { type: 'boolean' },
    extractedName: { type: 'string' },
    extractedInstitution: { type: 'string' },
    notes: { type: 'string' },
  },
  required: [
    'readable',
    'nameMatches',
    'relevantField',
    'extractedName',
    'extractedInstitution',
    'notes',
  ],
};

function mimeFromExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  return 'image/jpeg';
}

async function screenDocument(filePath, fullLegalName) {
  const mimeType = mimeFromExt(filePath);
  const data = fs.readFileSync(filePath).toString('base64');

  const contentPart =
    mimeType === 'application/pdf'
      ? { type: 'document', data, mime_type: mimeType }
      : { type: 'image', data, mime_type: mimeType };

  const client = getGeminiClient();
  const interaction = await client.interactions.create({
    model: SCREENING_MODEL,
    input: [
      {
        type: 'text',
        text: `Заявлене ПІБ спеціаліста: "${fullLegalName || '(не вказано)'}". Проаналізуй прикріплений документ.`,
      },
      contentPart,
    ],
    system_instruction: SCREENING_SYSTEM_INSTRUCTION,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: SCREENING_RESPONSE_SCHEMA,
    },
  });

  return JSON.parse(interaction.output_text);
}

// POST /api/specialists/me/documents — завантаження документів + AI-скринінг
exports.uploadDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Потрібен хоча б один файл' });
    }

    const profile = await prisma.specialistProfile.findUnique({
      where: { userId: req.dbUser.id },
    });
    if (!profile) {
      return res.status(404).json({ message: 'Профіль спеціаліста не знайдено' });
    }

    const newUrls = req.files.map((f) => `/uploads/specialist-docs/${f.filename}`);
    const documentsUrl = [...profile.documentsUrl, ...newUrls];

    let aiScreeningStatus = null;
    let aiScreeningNotes = null;
    let aiScreenedAt = null;

    try {
      const result = await screenDocument(req.files[0].path, profile.fullLegalName);
      aiScreenedAt = new Date();
      aiScreeningNotes = result.notes;
      if (!result.readable) {
        aiScreeningStatus = 'UNREADABLE';
      } else if (!result.relevantField) {
        aiScreeningStatus = 'NOT_RELEVANT';
      } else if (!result.nameMatches) {
        aiScreeningStatus = 'MISMATCH';
      } else {
        aiScreeningStatus = 'MATCH';
      }
    } catch (aiError) {
      console.error('⚠️ AI-скринінг документа не вдався (заявку все одно подаємо):', aiError);
    }

    const resetToPending = profile.verificationStatus === 'APPROVED';

    const updated = await prisma.specialistProfile.update({
      where: { userId: req.dbUser.id },
      data: {
        documentsUrl,
        ...(aiScreeningStatus && { aiScreeningStatus, aiScreeningNotes, aiScreenedAt }),
        ...(resetToPending && { verificationStatus: 'PENDING' }),
      },
    });

    res.status(200).json({ ...updated, verificationResetToPending: resetToPending });
  } catch (error) {
    console.error('❌ Помилка завантаження документів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// POST /api/specialists/me/photo — фото профілю, показується клієнтам публічно.
// Це НЕ документ верифікації, тому статус підтвердження не чіпаємо.
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Потрібен файл фото' });
    }

    const profile = await prisma.specialistProfile.findUnique({
      where: { userId: req.dbUser.id },
    });
    if (!profile) {
      return res.status(404).json({ message: 'Профіль спеціаліста не знайдено' });
    }

    const photoUrl = `/uploads/specialist-photos/${req.file.filename}`;

    const updated = await prisma.specialistProfile.update({
      where: { userId: req.dbUser.id },
      data: { photoUrl },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Помилка завантаження фото:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};
