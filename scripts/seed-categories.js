// Seed mínimo e idempotente: solo categorías (eventos y servicios).
// No crea usuarios ni eventos de ejemplo, para no ensuciar la base de producción.
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const EVENT_CATEGORIES = [
  'Techno', 'Jazz', 'Arte', 'Pop', 'Electrónica', 'Indie', 'Ambient', 'Rock', 'House', 'Festival',
];

const SERVICE_CATEGORIES = [
  'Catering', 'DJ', 'Fotografía', 'Video', 'Sonido', 'Decoración', 'Seguridad', 'Transporte',
];

(async () => {
  const rawUrl = process.env.DATABASE_URL || '';
  const connectionString = rawUrl
    .replace(/&channel_binding=[^&]*/g, '')
    .replace(/\?channel_binding=[^&]*&?/g, '?');
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  for (const name of EVENT_CATEGORIES) {
    await prisma.eventCategories.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of SERVICE_CATEGORIES) {
    await prisma.serviceCategories.upsert({ where: { name }, update: {}, create: { name } });
  }

  const eventCats = await prisma.eventCategories.findMany({ orderBy: { id: 'asc' } });
  const serviceCats = await prisma.serviceCategories.findMany({ orderBy: { id: 'asc' } });
  console.log('EVENT_CATEGORIES:', JSON.stringify(eventCats));
  console.log('SERVICE_CATEGORIES:', JSON.stringify(serviceCats));

  await prisma.$disconnect();
  await pool.end();
})().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
