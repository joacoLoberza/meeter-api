// Limpia los datos de prueba creados en Neon (eventos de test, follows y usuarios temporales).
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
    ssl: connectionString.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const events = await prisma.events.deleteMany({ where: { name: 'TEST Event Creation' } });
  console.log('EVENTOS_TEST_ELIMINADOS:', events.count);

  const users = await prisma.user.deleteMany({
    where: { email: { contains: '@matriz.test' } },
  });
  console.log('USUARIOS_TEMP_ELIMINADOS:', users.count);

  const follows = await prisma.follows.count();
  console.log('FOLLOWS_RESTANTES:', follows);

  const remainingEvents = await prisma.events.count();
  const remainingUsers = await prisma.user.count();
  console.log('EVENTOS_RESTANTES:', remainingEvents, 'USUARIOS_RESTANTES:', remainingUsers);

  await prisma.$disconnect();
  await pool.end();
})().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
