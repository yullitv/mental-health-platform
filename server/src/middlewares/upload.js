const multer = require("multer");

// Файл більше не пишеться на диск сервера — тримаємо його в пам'яті й
// одразу вивантажуємо в R2 (server/src/utils/r2Client.js). Це і рішення
// проблеми ефемерної файлової системи на хостингу, і крок до того, щоб
// приватні файли (донат-скріни) взагалі не лежали десь публічно доступні.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Дозволені лише JPG, PNG, WEBP або PDF файли"));
    }
  },
});

module.exports = upload;
