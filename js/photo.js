/**
 * photo.js — La foto del adulto: achicarla y pedir a /api/describe la palabra.
 * Achicar en un <canvas> y volver a codificar en JPEG borra los metadatos de
 * la foto (GPS, fecha, modelo del celular): solo viajan los píxeles.
 * El navegador habla únicamente con nuestro /api (CSP connect-src 'self');
 * la clave de la IA vive en el servidor y nunca llega aquí.
 */

import { DESCRIBE_TIMEOUT_MS, PHOTO } from './config.js';

/**
 * Achica la imagen a `maxSize` px de lado y la devuelve como JPEG en data URL.
 * @param {Blob} file
 * @param {number} maxSize
 * @param {number} quality
 * @returns {Promise<string>}
 */
export async function resizeImage(file, maxSize, quality) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Sin canvas 2D');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Las dos versiones de la foto: la que viaja a la IA y la miniatura que se guarda.
 * @param {Blob} file
 */
export async function preparePhoto(file) {
  const [upload, thumb] = await Promise.all([
    resizeImage(file, PHOTO.uploadSize, PHOTO.uploadQuality),
    resizeImage(file, PHOTO.thumbSize, PHOTO.thumbQuality),
  ]);
  return { upload, thumb };
}

/**
 * Respuesta de /api/describe, ya revisada.
 * `code` explica el fallo para el mensaje al adulto:
 * offline (sin internet), busy (IA saturada o límite del día),
 * unclear (no reconoció un objeto), config (falta la clave), failed (otro).
 * @typedef {{ ok: true, word: string, shortPhrase: string, longPhrase: string }
 *   | { ok: false, code: 'offline'|'busy'|'unclear'|'config'|'failed'|'cancelled' }} DescribeResult
 */

/** El navegador cree que no hay red (puede cambiar durante la espera). */
const isOffline = () => navigator.onLine === false;

/**
 * Pide la palabra de la foto. El servidor ya reintenta; aquí solo se espera
 * (con tope) y se traduce el resultado.
 * @param {string} image  data URL JPEG
 * @param {AbortSignal} signal  "Cancelar" o cerrar el panel
 * @returns {Promise<DescribeResult>}
 */
export async function describePhoto(image, signal) {
  if (isOffline()) return { ok: false, code: 'offline' };
  const timeout = AbortSignal.timeout(DESCRIBE_TIMEOUT_MS);
  try {
    const response = await fetch('api/describe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
      signal: AbortSignal.any([signal, timeout]),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && typeof body.word === 'string') {
      return {
        ok: true,
        word: body.word,
        shortPhrase: typeof body.shortPhrase === 'string' ? body.shortPhrase : '',
        longPhrase: typeof body.longPhrase === 'string' ? body.longPhrase : '',
      };
    }
    const known = ['busy', 'unclear', 'config'];
    return { ok: false, code: known.includes(body.error) ? body.error : 'failed' };
  } catch (error) {
    if (signal.aborted) return { ok: false, code: 'cancelled' };
    if (error instanceof Error && error.name === 'TimeoutError') return { ok: false, code: 'busy' };
    return { ok: false, code: isOffline() ? 'offline' : 'failed' };
  }
}
