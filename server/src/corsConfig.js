const DEFAULT_ORIGIN = "http://localhost:5173";

const allowedOrigins = (process.env.CLIENT_ORIGIN || DEFAULT_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = { allowedOrigins };
