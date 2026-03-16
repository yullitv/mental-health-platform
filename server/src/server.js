const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
// Якщо в .env не вказано порт, використовуємо 5000
const PORT = process.env.PORT || 5000;

// Middleware (проміжні обробники)
app.use(cors()); // Дозволяє фронтенду робити запити до бекенду
app.use(express.json()); // Дозволяє серверу читати дані у форматі JSON

// Базовий тестовий роут
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Mental Health Platform API!' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});