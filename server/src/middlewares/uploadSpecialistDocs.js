const multer = require("multer");

// Пам'ять, а не диск — файл одразу йде в R2 (server/src/utils/r2Client.js).
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const uploadSpecialistDocs = multer({
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

module.exports = uploadSpecialistDocs;
