const multer = require("multer");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const uploadSpecialistPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Дозволені лише JPG, PNG або WEBP файли"));
    }
  },
});

module.exports = uploadSpecialistPhoto;
