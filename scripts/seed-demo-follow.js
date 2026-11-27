// Crea un usuario de prueba que sigue al usuario real (para probar las listas en la app).
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

  const real = await prisma.user.findFirst({
    where: { email: 'juliserrano654@gmail.com' },
    select: { id: true },
  });
  if (!real) throw new Error('No se encontró el usuario real');

  const demo = await prisma.user.upsert({
    where: { email: 'demo.seguidor@matriz.test' },
    update: {},
    create: {
      user: 'demo_seguidor',
      name: 'Demo Seguidor',
      email: 'demo.seguidor@matriz.test',
      password: null,
      verified: true,
    },
    select: { id: true, user: true, name: true },
  });

  // El usuario demo sigue al usuario real.
  await prisma.follows.upsert({
    where: {
      followerFK_followingFK: {
        followerFK: demo.id,
        followingFK: real.id,
      },
    },
    update: {},
    create: { followerFK: demo.id, followingFK: real.id },
  });

  // Y el usuario real sigue al demo, para que las dos listas tengan contenido.
  await prisma.follows.upsert({
    where: {
      followerFK_followingFK: {
        followerFK: real.id,
        followingFK: demo.id,
      },
    },
    update: {},
    create: { followerFK: real.id, followingFK: demo.id },
  });

  const counts = await prisma.follows.count();
  console.log('DEMO:', JSON.stringify(demo));
  console.log('FOLLOWS_TOTAL:', counts);

  await prisma.$disconnect();
  await pool.end();
})().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
