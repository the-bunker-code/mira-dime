/**
 * storage.js — Guarda y valida los ajustes en localStorage.
 * localStorage puede fallar (modo privado, almacenamiento lleno, datos
 * viejos de otra versión). Por eso toda lectura y escritura va en try/catch
 * y todo lo que se lee pasa por normalizeSettings antes de usarse.
 */

import { LEVELS, MODES, ROUND_OPTIONS } from './config.js';

export const STORAGE_KEY = 'mira-y-dime:settings:v1';

/**
 * Ajustes del juego. Un solo objeto, para guardarlo y validarlo de una vez.
 * @typedef {Object} Settings
 * @property {import('./config.js').ModeId} mode   Modo elegido.
 * @property {import('./config.js').LevelId} level       Nivel.
 * @property {3|5|8} rounds                       Rondas por sesión.
 * @property {boolean} voice                      Voz encendida.
 * @property {boolean} sound                      Tonos encendidos.
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'letters',
  level: 'easy',
  rounds: 5,
  voice: true,
  sound: true,
});

/**
 * Devuelve ajustes válidos: descarta lo inválido y completa lo que falte.
 * @param {unknown} raw
 * @returns {Settings}
 */
export function normalizeSettings(raw) {
  const input = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
  /**
   * @param {unknown} value
   * @param {readonly unknown[]} allowed
   * @param {any} fallback
   */
  const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
  return {
    mode: pick(
      input.mode,
      MODES.map((m) => m.id),
      DEFAULT_SETTINGS.mode,
    ),
    level: pick(
      input.level,
      LEVELS.map((l) => l.id),
      DEFAULT_SETTINGS.level,
    ),
    rounds: pick(Number(input.rounds), ROUND_OPTIONS, DEFAULT_SETTINGS.rounds),
    voice: typeof input.voice === 'boolean' ? input.voice : DEFAULT_SETTINGS.voice,
    sound: typeof input.sound === 'boolean' ? input.sound : DEFAULT_SETTINGS.sound,
  };
}

/** @returns {Settings} */
export function loadSettings() {
  try {
    const text = globalThis.localStorage?.getItem(STORAGE_KEY);
    return normalizeSettings(text ? JSON.parse(text) : null);
  } catch {
    return normalizeSettings(null);
  }
}

/** @param {Settings} settings */
export function saveSettings(settings) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    // Si no se puede guardar, el juego sigue con los ajustes en memoria.
  }
}
