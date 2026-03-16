const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Створюємо пул підключень до PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Створюємо адаптер
const adapter = new PrismaPg(pool);

// Передаємо адаптер у клієнт Prisma
const prisma = new PrismaClient({ adapter });

module.exports = prisma;