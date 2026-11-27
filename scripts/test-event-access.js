require('dotenv/config');
const jwt = require('jsonwebtoken');

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const tokenFor = (id) =>
  jwt.sign({ id, role: 'CONSUMER' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const owner = tokenFor(1);
const demo = tokenFor(3);

let failures = 0;

async function call(name, method, path, { token = owner, body } = {}) {
  const params = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body !== undefined) {
    params.headers['Content-Type'] = 'application/json';
    params.body = JSON.stringify(body);
  }
  const response = await fetch(`${base}${path}`, params);
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  console.log(`[${name}] ${method} ${path} -> ${response.status} ${text.slice(0, 220)}`);
  return { status: response.status, json };
}

function expect(name, condition) {
  if (condition) {
    console.log(`  ✔ ${name}`);
  } else {
    failures++;
    console.log(`  ✘ ${name}`);
  }
}

(async () => {
  const created = await call('crear evento', 'POST', '/events', {
    body: {
      name: 'Prueba acceso organizador',
      initDate: new Date(Date.now() + 86400000).toISOString(),
      location: 'Palacio Matriz, Buenos Aires',
      open: true,
    },
  });
  const eventId = created.json.id;
  if (!eventId) throw new Error('No se pudo crear el evento de prueba');

  try {
    // 1) Buscador de usuarios
    const search = await call('buscar usuarios', 'GET', '/users/search?q=demo');
    expect('el buscador encuentra al usuario demo (id 3)',
      Array.isArray(search.json) && search.json.some((u) => u.id === 3));

    // 2) Colaboradores
    const added = await call('agregar colaborador 3', 'POST', `/events/${eventId}/collaborators`, {
      body: { userId: 3 },
    });
    expect('agregar colaborador -> 201', added.status === 201);
    const list = await call('listar colaboradores', 'GET', `/events/${eventId}/collaborators`);
    expect('el colaborador aparece en la lista',
      list.json.data?.some((u) => u.id === 3));

    const denied = await call('no colaborador intenta agregar otro', 'POST', `/events/${eventId}/collaborators`, {
      token: demo,
      body: { userId: 1 },
    });
    expect('un no organizador no puede agregar colaboradores -> 403', denied.status === 403);

    // 3) Modo NEGRA: el colaborador puede entrar igual (bypass)
    await call('modo blacklist', 'PATCH', `/events/${eventId}/access-rules`, {
      body: { mode: 'BLACKLIST' },
    });
    await call('agregar usuario 3 a la lista negra', 'POST', `/events/${eventId}/access-rules`, {
      body: { userId: 3, type: 'BLACKLIST' },
    });
    const asCollaborator = await call('colaborador reserva (bypass)', 'POST', `/events/${eventId}/guests`, {
      token: demo,
    });
    expect('colaborador ignoró la lista negra -> 201', asCollaborator.status === 201);

    await call('quitar reserva de 3', 'DELETE', `/events/${eventId}/guests/3`);
    await call('quitar colaborador 3', 'DELETE', `/events/${eventId}/collaborators/3`);
    const blocked = await call('usuario en lista negra reserva', 'POST', `/events/${eventId}/guests`, {
      token: demo,
    });
    expect('lista negra bloquea el registro -> 403', blocked.status === 403);
    expect('el mensaje explica el motivo',
      String(blocked.json.message).includes('lista negra'));

    // 4) Modo BLANCA
    await call('modo whitelist', 'PATCH', `/events/${eventId}/access-rules`, {
      body: { mode: 'WHITELIST' },
    });
    const notListed = await call('usuario fuera de la blanca reserva', 'POST', `/events/${eventId}/guests`, {
      token: demo,
    });
    expect('lista blanca bloquea a quien no está -> 403', notListed.status === 403);
    expect('el mensaje explica el motivo',
      String(notListed.json.message).includes('lista blanca'));

    await call('agregar usuario 3 a la blanca', 'POST', `/events/${eventId}/access-rules`, {
      body: { userId: 3, type: 'WHITELIST' },
    });
    const rules = await call('ver listas', 'GET', `/events/${eventId}/access-rules`);
    expect('modo es WHITELIST', rules.json.mode === 'WHITELIST');
    expect('usuario 3 está en la blanca', rules.json.whitelist?.some((u) => u.id === 3));
    expect('usuario 3 NO está en la negra', !rules.json.blacklist?.some((u) => u.id === 3));

    const allowed = await call('usuario en la blanca reserva', 'POST', `/events/${eventId}/guests`, {
      token: demo,
    });
    expect('lista blanca permite el registro -> 201', allowed.status === 201);

    // 5) Volver a ABIERTO y limpiar
    await call('modo open', 'PATCH', `/events/${eventId}/access-rules`, {
      body: { mode: 'OPEN' },
    });
    await call('quitar reserva de 3 (final)', 'DELETE', `/events/${eventId}/guests/3`);
    await call('quitar regla de 3', 'DELETE', `/events/${eventId}/access-rules/3`);
    const finalRules = await call('ver listas vacías', 'GET', `/events/${eventId}/access-rules`);
    expect('listas vacías', finalRules.json.whitelist?.length === 0 && finalRules.json.blacklist?.length === 0);
  } finally {
    await call('eliminar evento de prueba', 'DELETE', `/events/${eventId}`);
  }

  console.log(failures ? `\n${failures} FALLOS` : '\nTODAS LAS COMPROBACIONES PASARON');
  process.exitCode = failures ? 1 : 0;
})().catch((error) => {
  console.error('ERROR:', error.message);
  process.exitCode = 1;
});
