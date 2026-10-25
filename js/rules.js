/**
 * rules.js — Las reglas del juego: qué objetos tiene la sesión, en qué piezas
 * se parte cada uno y qué piezas se ven para elegir.
 * LÓGICA PURA: no toca el DOM, ni el audio, ni localStorage. Recibe los
 * datos y una función `random`, y devuelve objetos. Por eso se puede
 * probar con `node --test` y una semilla fija, sin navegador.
 */

import { LEVEL_RULES, MAX_PHRASE_WORDS, TEXT } from './config.js';
import { capitalize, splitLetters, splitWords, syllabify } from './spanish.js';

/** @typedef {import('./config.js').ModeId} ModeId */
/** @typedef {import('./config.js').LevelId} LevelId */
/** @typedef {import('./config.js').GameObject} GameObject */
/** @typedef {() => number} Random  Devuelve un número en [0, 1), como Math.random. */

/**
 * Una ronda: un objeto partido en piezas. Es inmutable: lo que la niña hace
 * en ella vive en `state`.
 * @typedef {Object} Round
 * @property {ModeId} mode
 * @property {LevelId} level
 * @property {GameObject} object
 * @property {string[]} units     Piezas en orden: sílabas, letras o palabras.
 * @property {string} target      Lo que se arma: la palabra o la frase.
 * @property {boolean} guide      Las casillas muestran la pieza tenue.
 * @property {number} bankSize    Cuántas piezas se ven a la vez.
 * @property {string} question    Lo que dice el globo y la voz.
 */

/* ---------- Utilidades de azar (reciben `random` para poder probarlas) ---------- */

/**
 * Copia mezclada (Fisher-Yates). No modifica el arreglo original.
 * @template T
 * @param {T[]} items
 * @param {Random} random
 * @returns {T[]}
 */
export function shuffle(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ---------- Piezas de cada objeto ---------- */

/**
 * Lo que se arma en ese modo: la palabra o una de sus frases.
 * @param {GameObject} object
 * @param {ModeId} mode
 */
export function targetOf(object, mode) {
  if (mode === 'shortPhrase') return object.shortPhrase;
  if (mode === 'longPhrase') return object.longPhrase;
  return object.word;
}

/**
 * Piezas en orden. Las frases de más de MAX_PHRASE_WORDS palabras no se usan.
 * @param {GameObject} object
 * @param {ModeId} mode
 * @returns {string[]}
 */
export function unitsOf(object, mode) {
  if (mode === 'syllables') return syllabify(object.word);
  if (mode === 'letters') return splitLetters(object.word);
  const words = splitWords(targetOf(object, mode));
  return words.length <= MAX_PHRASE_WORDS ? words : [];
}

/**
 * ¿El objeto sirve para ese modo y nivel? (cantidad de piezas dentro del rango)
 * @param {GameObject} object
 * @param {ModeId} mode
 * @param {LevelId} level
 */
export function fitsLevel(object, mode, level) {
  const { min, max } = LEVEL_RULES[mode][level];
  const count = unitsOf(object, mode).length;
  return count >= min && count <= max;
}

/**
 * Elige los objetos de la sesión, en orden.
 * - Solo los que sirven para el modo y nivel. Si ninguno sirve, los que más
 *   se acercan (así una galería rara nunca deja el juego sin rondas).
 * - Distintos mientras alcancen; nunca el mismo dos rondas seguidas.
 * - `firstId` (la foto recién tomada) va primero si sirve.
 * @param {GameObject[]} objects
 * @param {{ mode: ModeId, level: LevelId, rounds: number }} settings
 * @param {{ firstId?: string|null, random?: Random }} [context]
 * @returns {GameObject[]}
 */
export function planSession(objects, { mode, level, rounds }, { firstId = null, random = Math.random } = {}) {
  const usable = objects.filter((object) => unitsOf(object, mode).length > 0);
  if (usable.length === 0) return [];
  let pool = usable.filter((object) => fitsLevel(object, mode, level));
  if (pool.length === 0) {
    const { min, max } = LEVEL_RULES[mode][level];
    /** @param {GameObject} object */
    const distance = (object) => {
      const count = unitsOf(object, mode).length;
      return count < min ? min - count : count - max;
    };
    const best = Math.min(...usable.map(distance));
    pool = usable.filter((object) => distance(object) === best);
  }

  const first = pool.find((object) => object.id === firstId);
  /** @type {GameObject[]} */
  const plan = first ? [first] : [];
  while (plan.length < rounds) {
    const used = new Set(plan.map((object) => object.id));
    const fresh = pool.filter((object) => !used.has(object.id));
    const previous = plan[plan.length - 1];
    const candidates = fresh.length > 0 ? fresh : pool.filter((object) => object !== previous);
    const choices = candidates.length > 0 ? candidates : pool;
    plan.push(shuffle(choices, random)[0]);
  }
  return plan;
}

/**
 * Crea la ronda de un objeto.
 * @param {GameObject} object
 * @param {{ mode: ModeId, level: LevelId }} settings
 * @returns {Round}
 */
export function createRound(object, { mode, level }) {
  const rules = LEVEL_RULES[mode][level];
  const target = targetOf(object, mode);
  const isPhrase = mode === 'shortPhrase' || mode === 'longPhrase';
  return Object.freeze({
    mode,
    level,
    object,
    units: unitsOf(object, mode),
    target,
    guide: rules.guide,
    bankSize: rules.bank,
    question: isPhrase ? `${capitalize(target)}.` : `${TEXT.build} ${target}.`,
  });
}

/* ---------- Banco de piezas: lo que se ve para elegir ---------- */

/**
 * Textos distintos, en el orden en que aparecen.
 * @param {string[]} items
 */
function distinct(items) {
  return [...new Set(items)];
}

/**
 * Banco al empezar: la pieza que sigue y otras de las que faltan, sin
 * repetidas, mezcladas. Nunca más de `bankSize`.
 * @param {string[]} remaining  Piezas que faltan, en orden (la primera es la que sigue).
 * @param {number} bankSize
 * @param {Random} random
 * @returns {string[]}
 */
export function initialBank(remaining, bankSize, random) {
  if (remaining.length === 0) return [];
  const [next] = remaining;
  const others = shuffle(
    distinct(remaining).filter((text) => text !== next),
    random,
  ).slice(0, bankSize - 1);
  return shuffle([next, ...others], random);
}

/**
 * Banco después de colocar la pieza de la posición `tapped`. Las demás piezas
 * NO se mueven (previsibilidad): solo cambia el lugar que quedó libre.
 * La pieza que sigue siempre está en el banco.
 * @param {string[]} bank       Banco antes del toque.
 * @param {number} tapped       Posición tocada.
 * @param {string[]} remaining  Piezas que faltan DESPUÉS de colocar.
 * @param {number} bankSize
 * @param {Random} random
 * @returns {string[]}
 */
export function nextBank(bank, tapped, remaining, bankSize, random) {
  if (remaining.length === 0) return [];
  const [next] = remaining;
  const left = new Set(remaining);
  // Solo puede sobrar la pieza tocada; se queda si todavía falta otra igual ("pa-pa").
  /** @type {Array<string|null>} */
  const result = bank.map((text) => (left.has(text) ? text : null));

  if (!result.includes(next)) {
    // Va al lugar libre; si no hay, reemplaza a la tocada (que se repite más adelante).
    const free = result.indexOf(null);
    result[free === -1 ? tapped : free] = next;
  }
  for (let i = 0; i < result.length; i++) {
    if (result[i] !== null) continue;
    const options = distinct(remaining).filter((text) => !result.includes(text));
    result[i] = options.length > 0 ? shuffle(options, random)[0] : null;
  }
  return result.filter((text) => text !== null).slice(0, bankSize);
}

/* ---------- Frases de la voz ---------- */

/**
 * Lo que dice la voz al armar todo: "¡Pelota!" o "¡La pelota roja!".
 * @param {Round} round
 */
export function resultPhrase(round) {
  return `¡${capitalize(round.target)}!`;
}

/**
 * Cómo se dice una pieza sola. Las letras se dicen en minúscula para que la
 * voz no las deletree como sigla.
 * @param {string} unit
 */
export function unitPhrase(unit) {
  return unit.toLowerCase();
}
