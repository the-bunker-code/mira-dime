/**
 * worker/index.js — Cloudflare Worker con archivos estáticos.
 * Cloudflare sirve el juego (index.html, css/, js/…) directo desde la carpeta;
 * este código solo corre para /api/* (ver run_worker_first en wrangler.jsonc).
 *
 * POST /api/describe recibe { image } (JPEG en data URL), pregunta a OpenRouter
 * y devuelve { word, shortPhrase, longPhrase }. La clave vive como secret de
 * Cloudflare (OPENROUTER_API_KEY), nunca en el navegador ni en el repositorio.
 * Ver README › IA de las fotos.
 */

import { LIMITS, describeImage } from '../server/describe.js';

/**
 * _headers no se aplica a lo que responde el Worker: estas cabeceras van a mano.
 * @param {Record<string, unknown>} body
 * @param {number} status
 */
const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });

/**
 * @param {Request} request
 * @param {{ OPENROUTER_API_KEY?: string }} env
 */
async function describe(request, env) {
  // Solo nuestra página: otra web no puede gastar el límite diario desde sus visitantes.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'failed' }, 403);
  if (!env.OPENROUTER_API_KEY) return json({ error: 'config' }, 500);
  if (Number(request.headers.get('Content-Length') ?? 0) > LIMITS.maxImageLength + 1000) {
    return json({ error: 'failed' }, 413);
  }

  /** @type {any} */
  const body = await request.json().catch(() => null);
  const result = await describeImage(body?.image, {
    apiKey: env.OPENROUTER_API_KEY,
    fetch: (url, init) => fetch(url, init),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    random: Math.random,
    now: Date.now,
  });
  return json(result.body, result.status);
}

export default {
  /**
   * @param {Request} request
   * @param {{ OPENROUTER_API_KEY?: string, ASSETS: { fetch: (request: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/describe') {
      return request.method === 'POST' ? describe(request, env) : json({ error: 'failed' }, 405);
    }
    if (pathname.startsWith('/api/')) return json({ error: 'failed' }, 404);
    return env.ASSETS.fetch(request);
  },
};
