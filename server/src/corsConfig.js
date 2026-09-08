// Список дозволених origin для CORS (Express) і Socket.io.
//
// CLIENT_ORIGIN у .env — один або кілька origin через кому, напр.
// "http://localhost:5173,https://opora.example.com". Якщо змінна не
// задана, дозволяємо лише локальний dev-сервер Vite — тобто "з коробки"
// нічого стороннього достукатись до API не може, а перед деплоєм
// достатньо додати в .env реальний домен фронтенду.
const DEFAULT_ORIGIN = "http://localhost:5173";

const allowedOrigins = (process.env.CLIENT_ORIGIN || DEFAULT_ORIGIN)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = { allowedOrigins };
