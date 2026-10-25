/**
 * server/describe.js — Lógica de /api/describe: pedir a OpenRouter la palabra
 * de una foto, aguantando lentitud y saturación de los modelos gratuitos.
 * No depende de Cloudflare: `fetch`, `sleep` y `random` llegan por parámetro,
 * así tests/describe.test.js lo prueba con respuestas falsas y sin esperar.
 *
 * `openrouter/free` elige un modelo gratuito que entienda imágenes; cada
 * reintento puede caer en otro modelo, lo que suele resolver la saturación.
 */

import { normalizePhrase } from '../js/objects.js';
import { isSpanishWord, normalizeWord } from '../js/spanish.js';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const MODEL = 'openrouter/free';

/** Límites de la espera. */
export const LIMITS = {
  attempts: 4,
  attemptTimeoutMs: 30_000,
  budgetMs: 100_000,
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
  maxImageLength: 1_500_000,
};

const IMAGE_PATTERN = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;

const PROMPT = `Mira la foto y nombra el objeto principal para una niña de 4 años que aprende a hablar.
Responde SOLO con JSON, sin texto alrededor:
{"word":"pelota","shortPhrase":"la pelota","longPhrase":"la pelota es roja"}
Reglas:
- word: una sola palabra en español, sustantivo común, singular, en minúsculas, sin artículo. La palabra más simple y conocida.
- shortPhrase: exactamente 2 palabras (artículo + word).
- longPhrase: 3 o 4 palabras, simple, concreta y sobre lo que se ve.
- Si aparece una persona, no la describas: nombra solo el objeto.
- Si no hay un objeto claro, responde {"word":""}.`;

/**
 * Saca la respuesta del modelo y la valida. null si no sirve (y hay que reintentar).
 * @param {unknown} content  Texto del modelo.
 * @returns {{ word: string, shortPhrase: string, longPhrase: string } | 'unclear' | null}
 */
export function parseModelReply(content) {
  if (typeof content !== 'string') return null;
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const input = /** @type {Record<string, unknown>} */ (data);
  if (input.word === '') return 'unclear';
  const word = normalizeWord(typeof input.word === 'string' ? input.word : '');
  if (!isSpanishWord(word) || word.length > 20) return null;
  return {
    word,
    shortPhrase: normalizePhrase(input.shortPhrase, 2, 2),
    longPhrase: normalizePhrase(input.longPhrase, 3, 4),
  };
}

/**
 * Segundos de Retry-After, si viene como número.
 * @param {Headers} headers
 */
function retryAfterMs(headers) {
  const seconds = Number(headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

/**
 * Espera antes del intento `attempt` (desde 2): 1 s, 2 s, 4 s... con un poco
 * de azar para no reintentar todos a la vez, respetando Retry-After hasta 10 s.
 * @param {number} attempt
 * @param {number} retryAfter
 * @param {() => number} random
 */
export function backoffMs(attempt, retryAfter, random) {
  const exponential = LIMITS.baseDelayMs * 2 ** (attempt - 2);
  const base = Math.min(LIMITS.maxDelayMs, Math.max(exponential, retryAfter));
  return base + Math.floor(random() * 500);
}

/** Estados que suelen pasar solos: límite, proveedor caído, sin proveedores. */
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504, 520, 522, 524, 529]);

/**
 * @typedef {{ status: number, body: Record<string, unknown> }} DescribeResponse
 * @typedef {{ apiKey: string, fetch: typeof fetch, sleep: (ms: number) => Promise<void>, random: () => number, now: () => number }} DescribeDeps
 */

/**
 * Pide la palabra de la foto, con reintentos.
 * @param {unknown} image
 * @param {DescribeDeps} deps
 * @returns {Promise<DescribeResponse>}
 */
export async function describeImage(image, { apiKey, fetch, sleep, random, now }) {
  if (typeof image !== 'string' || image.length > LIMITS.maxImageLength || !IMAGE_PATTERN.test(image)) {
    return { status: 400, body: { error: 'failed' } };
  }
  const started = now();
  let lastError = 'busy';
  let badRequests = 0;
  let retryAfter = 0;

  for (let attempt = 1; attempt <= LIMITS.attempts; attempt++) {
    if (attempt > 1) {
      const delay = backoffMs(attempt, retryAfter, random);
      if (now() - started + delay >= LIMITS.budgetMs) break;
      await sleep(delay);
    }
    const remaining = LIMITS.budgetMs - (now() - started);
    if (remaining <= 0) break;
    retryAfter = 0;

    /** @type {Response} */
    let response;
    try {
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Mira y Dime' },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: PROMPT },
                { type: 'image_url', image_url: { url: image } },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(Math.min(LIMITS.attemptTimeoutMs, remaining)),
      });
    } catch {
      lastError = 'busy'; // tardó demasiado o se cortó la conexión
      continue;
    }

    if (response.status === 401 || response.status === 402 || response.status === 403) {
      return { status: 500, body: { error: 'config' } };
    }
    if (response.status === 400) {
      // Puede ser un modelo que no acepta imágenes: se prueba una vez más.
      badRequests++;
      lastError = 'failed';
      if (badRequests > 1) break;
      continue;
    }
    if (RETRYABLE.has(response.status)) {
      retryAfter = retryAfterMs(response.headers);
      lastError = 'busy';
      continue;
    }
    if (!response.ok) {
      lastError = 'failed';
      continue;
    }

    /** @type {any} */
    const data = await response.json().catch(() => null);
    const reply = parseModelReply(data?.choices?.[0]?.message?.content);
    if (reply === 'unclear') return { status: 422, body: { error: 'unclear' } };
    if (reply) return { status: 200, body: { ...reply, model: typeof data?.model === 'string' ? data.model : '' } };
    // 200 sin una respuesta usable (error dentro del cuerpo o JSON roto): otro intento.
    lastError = data?.error ? 'busy' : 'unclear';
  }

  return { status: lastError === 'failed' ? 502 : 503, body: { error: lastError } };
}
