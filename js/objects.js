/**
 * objects.js — Los "objetos de casa": palabra, frases y miniatura de la foto.
 * Se guardan en localStorage, los más nuevos primero. Lo que se lee pasa por
 * normalizeObject: una miniatura que no sea JPEG en base64, o una palabra con
 * signos, se descarta. Así nada de lo guardado puede inyectar HTML.
 * Sin localStorage (modo privado) los objetos viven en memoria hasta cerrar.
 */

import { MAX_SAVED_OBJECTS } from './config.js';
import { isSpanishWord, normalizeWord, splitWords } from './spanish.js';

export const OBJECTS_KEY = 'mira-y-dime:objects:v1';

/** Miniatura JPEG en base64, como la que arma photo.js. Unos 30 KB; el tope deja margen. */
const PHOTO_PATTERN = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;
const MAX_PHOTO_LENGTH = 200_000;
const MAX_WORD_LENGTH = 20;

/** @typedef {import('./config.js').GameObject} GameObject */

/**
 * Frase limpia en minúsculas, o '' si no tiene entre `min` y `max` palabras
 * válidas. '' deja ese modo sin este objeto, pero el objeto sirve para los demás.
 * @param {unknown} raw
 * @param {number} min
 * @param {number} max
 */
export function normalizePhrase(raw, min, max) {
  if (typeof raw !== 'string') return '';
  const words = splitWords(raw);
  if (words.length < min || words.length > max || !words.every(isSpanishWord)) return '';
  return words.join(' ');
}

/**
 * Un objeto válido, o null si no se puede usar.
 * @param {unknown} raw
 * @returns {GameObject|null}
 */
export function normalizeObject(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const input = /** @type {Record<string, unknown>} */ (raw);
  const word = normalizeWord(typeof input.word === 'string' ? input.word : '');
  if (!isSpanishWord(word) || word.length > MAX_WORD_LENGTH) return null;
  const id = typeof input.id === 'string' && /^[a-z0-9-]{1,40}$/.test(input.id) ? input.id : null;
  if (!id) return null;
  /** @type {GameObject} */
  const object = {
    id,
    word,
    shortPhrase: normalizePhrase(input.shortPhrase, 2, 2),
    longPhrase: normalizePhrase(input.longPhrase, 3, 4),
  };
  const { photo } = input;
  if (typeof photo === 'string' && photo.length <= MAX_PHOTO_LENGTH && PHOTO_PATTERN.test(photo)) {
    object.photo = photo;
  }
  return object;
}

/**
 * Lista válida: sin inválidos, sin ids repetidos, como mucho MAX_SAVED_OBJECTS.
 * @param {unknown} raw
 * @returns {GameObject[]}
 */
export function normalizeObjects(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  /** @type {GameObject[]} */
  const result = [];
  for (const item of raw) {
    const object = normalizeObject(item);
    if (!object || seen.has(object.id)) continue;
    seen.add(object.id);
    result.push(object);
  }
  return result.slice(0, MAX_SAVED_OBJECTS);
}

/**
 * Id nuevo, único entre los guardados: "pelota", "pelota-2"...
 * @param {string} word
 * @param {GameObject[]} existing
 */
export function newObjectId(word, existing) {
  const base =
    normalizeWord(word)
      .normalize('NFD')
      .replace(/[^a-z]/g, '')
      .slice(0, 30) || 'objeto';
  const ids = new Set(existing.map((object) => object.id));
  if (!ids.has(`casa-${base}`)) return `casa-${base}`;
  let n = 2;
  while (ids.has(`casa-${base}-${n}`)) n++;
  return `casa-${base}-${n}`;
}

/** Copia en memoria: es la fuente de verdad si localStorage falla. */
/** @type {GameObject[]|null} */
let memory = null;

/** @returns {GameObject[]} */
export function loadObjects() {
  if (memory) return memory;
  try {
    const text = globalThis.localStorage?.getItem(OBJECTS_KEY);
    memory = normalizeObjects(text ? JSON.parse(text) : []);
  } catch {
    memory = [];
  }
  return memory;
}

/**
 * Guarda la lista. Si el almacenamiento está lleno, quita los más viejos
 * hasta que entre. Devuelve la lista que quedó.
 * @param {GameObject[]} objects
 * @returns {GameObject[]}
 */
export function saveObjects(objects) {
  let list = normalizeObjects(objects);
  memory = list;
  for (;;) {
    try {
      globalThis.localStorage?.setItem(OBJECTS_KEY, JSON.stringify(list));
      return list;
    } catch (error) {
      // Bloqueado (modo privado estricto): la lista entera sigue en memoria.
      const full = error instanceof Error && error.name === 'QuotaExceededError';
      if (!full || list.length === 0) return list;
      // Sin espacio: se guardan sin los más viejos.
      list = list.slice(0, -1);
      memory = list;
    }
  }
}

/** Solo para las pruebas: olvida la copia en memoria. */
export function resetObjectsMemory() {
  memory = null;
}
