/**
 * Pruebas de server/describe.js con un OpenRouter falso: lento, saturado,
 * con respuestas rotas o sin clave. Nada sale a internet y nada espera de verdad.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LIMITS, MODEL, backoffMs, describeImage, parseModelReply } from '../server/describe.js';

const IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const GOOD = '{"word":"Pelota","shortPhrase":"la pelota","longPhrase":"la pelota es roja"}';

/**
 * @param {number} status
 * @param {unknown} body
 * @param {Record<string, string>} [headers]
 */
function reply(status, body, headers = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
}

/** @param {string} content */
const completion = (content) => reply(200, { model: 'vision/free-model', choices: [{ message: { content } }] });

/**
 * Dependencias falsas: `responses` se devuelven en orden; el reloj avanza con sleep.
 * @param {Array<Response | Error>} responses
 */
function fakeDeps(responses) {
  let clock = 0;
  /** @type {number[]} */
  const sleeps = [];
  /** @type {any[]} */
  const requests = [];
  return {
    sleeps,
    requests,
    deps: {
      apiKey: 'test-key',
      /** @param {string} url @param {RequestInit} init */
      fetch: async (url, init) => {
        requests.push({ url, body: JSON.parse(String(init.body)), headers: init.headers });
        const next = responses.shift();
        if (!next) throw new Error('sin más respuestas');
        if (next instanceof Error) throw next;
        return next;
      },
      /** @param {number} ms */
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
      random: () => 0,
      now: () => clock,
    },
  };
}

test('respuesta buena al primer intento: palabra limpia y modelo que contestó', async () => {
  const { deps, requests } = fakeDeps([completion(`Claro: ${GOOD}`)]);
  const result = await describeImage(IMAGE, /** @type {any} */ (deps));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    word: 'pelota',
    shortPhrase: 'la pelota',
    longPhrase: 'la pelota es roja',
    model: 'vision/free-model',
  });
  assert.equal(requests[0].body.model, MODEL);
  assert.equal(requests[0].body.messages[0].content[1].image_url.url, IMAGE);
  assert.equal(requests[0].headers.Authorization, 'Bearer test-key');
});

test('saturado (429, 503) se reintenta con espera creciente y luego contesta', async () => {
  const { deps, sleeps } = fakeDeps([reply(429, {}), reply(503, {}), completion(GOOD)]);
  const result = await describeImage(IMAGE, /** @type {any} */ (deps));
  assert.equal(result.status, 200);
  assert.deepEqual(sleeps, [1000, 2000]);
});

test('Retry-After se respeta, con tope de 10 s', async () => {
  const { deps, sleeps } = fakeDeps([
    reply(429, {}, { 'Retry-After': '7' }),
    reply(429, {}, { 'Retry-After': '60' }),
    completion(GOOD),
  ]);
  await describeImage(IMAGE, /** @type {any} */ (deps));
  assert.deepEqual(sleeps, [7000, LIMITS.maxDelayMs]);
});

test('siempre saturado: tras 4 intentos responde "busy"', async () => {
  const { deps, requests } = fakeDeps([reply(429, {}), reply(502, {}), reply(503, {}), reply(529, {})]);
  const result = await describeImage(IMAGE, /** @type {any} */ (deps));
  assert.equal(requests.length, LIMITS.attempts);
  assert.deepEqual(result, { status: 503, body: { error: 'busy' } });
});

test('lentitud o corte de red cuenta como saturado y se reintenta', async () => {
  const timeout = Object.assign(new Error('tarde'), { name: 'TimeoutError' });
  const { deps } = fakeDeps([timeout, completion(GOOD)]);
  assert.equal((await describeImage(IMAGE, /** @type {any} */ (deps))).status, 200);
});

test('respuesta rota o con el largo equivocado: otro intento', async () => {
  const { deps, requests } = fakeDeps([
    completion('no sé'),
    completion('{"word":"pelota roja grande"}'),
    reply(200, { error: { code: 429, message: 'Rate limit exceeded' } }),
    completion(GOOD),
  ]);
  const result = await describeImage(IMAGE, /** @type {any} */ (deps));
  assert.equal(result.status, 200);
  assert.equal(requests.length, 4);
});

test('respuestas siempre inservibles terminan en "unclear"', async () => {
  const { deps } = fakeDeps([completion('{}'), completion('{}'), completion('{}'), completion('{}')]);
  assert.deepEqual(await describeImage(IMAGE, /** @type {any} */ (deps)), { status: 503, body: { error: 'unclear' } });
});

test('sin objeto claro ({"word":""}) se avisa enseguida, sin reintentar', async () => {
  const { deps, requests } = fakeDeps([completion('{"word":""}')]);
  assert.deepEqual(await describeImage(IMAGE, /** @type {any} */ (deps)), { status: 422, body: { error: 'unclear' } });
  assert.equal(requests.length, 1);
});

test('clave inválida o sin créditos: "config", sin reintentar', async () => {
  for (const status of [401, 402, 403]) {
    const { deps, requests } = fakeDeps([reply(status, {})]);
    assert.deepEqual(await describeImage(IMAGE, /** @type {any} */ (deps)), { status: 500, body: { error: 'config' } });
    assert.equal(requests.length, 1);
  }
});

test('400 (modelo sin visión) se prueba una vez más y luego "failed"', async () => {
  const ok = fakeDeps([reply(400, {}), completion(GOOD)]);
  assert.equal((await describeImage(IMAGE, /** @type {any} */ (ok.deps))).status, 200);
  const bad = fakeDeps([reply(400, {}), reply(400, {})]);
  assert.deepEqual(await describeImage(IMAGE, /** @type {any} */ (bad.deps)), {
    status: 502,
    body: { error: 'failed' },
  });
  assert.equal(bad.requests.length, 2);
});

test('otros errores (404) se reintentan como fallo', async () => {
  const { deps } = fakeDeps([reply(404, {}), completion(GOOD)]);
  assert.equal((await describeImage(IMAGE, /** @type {any} */ (deps))).status, 200);
});

test('el presupuesto total corta los reintentos', async () => {
  const { deps, requests } = fakeDeps([
    reply(429, {}, { 'Retry-After': '10' }),
    reply(429, {}, { 'Retry-After': '10' }),
  ]);
  const slow = { ...deps, now: () => (requests.length === 0 ? 0 : LIMITS.budgetMs - 5000) };
  const result = await describeImage(IMAGE, /** @type {any} */ (slow));
  assert.equal(requests.length, 1);
  assert.equal(result.body.error, 'busy');
});

test('imagen inválida o enorme: 400 sin llamar a la IA', async () => {
  for (const image of [
    null,
    'hola',
    'data:image/png;base64,AAAA',
    `data:image/jpeg;base64,${'A'.repeat(LIMITS.maxImageLength)}`,
  ]) {
    const { deps, requests } = fakeDeps([]);
    assert.equal((await describeImage(image, /** @type {any} */ (deps))).status, 400);
    assert.equal(requests.length, 0);
  }
});

test('parseModelReply: valida palabra y frases', () => {
  assert.equal(parseModelReply(42), null);
  assert.equal(parseModelReply('{roto}'), null);
  assert.equal(parseModelReply('"texto"'), null);
  assert.equal(parseModelReply('{"word":5}'), null);
  assert.deepEqual(parseModelReply('{"word":"Gato","shortPhrase":"un gato negro"}'), {
    word: 'gato',
    shortPhrase: '',
    longPhrase: '',
  });
});

test('backoff: 1 s, 2 s, 4 s con un poco de azar', () => {
  assert.equal(
    backoffMs(2, 0, () => 0),
    1000,
  );
  assert.equal(
    backoffMs(3, 0, () => 0),
    2000,
  );
  assert.equal(
    backoffMs(4, 0, () => 0.999),
    4499,
  );
});
