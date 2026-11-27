// Borra los eventos de prueba creados por scripts/test-create-event.js
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

(async () => {
  const rawUrl = process.env.DATABASE_URL || '';
  const connectionString = rawUrl
    .replace(/&channel_binding=[^&]*/g, '')
    .replace(/\?channel_binding=[^&]*&?/g, '?');
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=')
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const deleted = await prisma.events.deleteMany({
    where: { name: { startsWith: 'Prueba ' } },
  });
  console.log('EVENTOS_PRUEBA_ELIMINADOS:', deleted.count);
  console.log('EVENTOS_RESTANTES:', await prisma.events.count());

  await prisma.$disconnect();
  await pool.end();
})().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
