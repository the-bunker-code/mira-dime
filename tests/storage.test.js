/**
 * Pruebas de storage.js: lo que llega de localStorage no es confiable.
 * localStorage se reemplaza por uno en memoria (tests/helpers.js).
 */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_SETTINGS, STORAGE_KEY, loadSettings, normalizeSettings, saveSettings } from '../js/storage.js';
import { createMemoryStorage, useStorage } from './helpers.js';

/** @type {() => void} */
let restore = () => {};
afterEach(() => restore());

test('sin nada guardado se usan los ajustes por defecto', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings('texto'), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings([1, 2]), DEFAULT_SETTINGS);
});

test('los valores válidos se respetan', () => {
  const settings = { mode: 'letters', level: 'hard', rounds: 8, voice: false, sound: false };
  assert.deepEqual(normalizeSettings(settings), settings);
});

test('cada valor inválido se corrige solo, sin tocar el resto', () => {
  const fixed = normalizeSettings({
    mode: 'volar',
    level: 'hard',
    rounds: 4, // solo 3, 5 u 8
    voice: 'sí', // debe ser booleano
    sound: false,
  });
  assert.deepEqual(fixed, { ...DEFAULT_SETTINGS, level: 'hard', sound: false });
});

test('las rondas guardadas como texto se aceptan; las raras no', () => {
  assert.equal(normalizeSettings({ rounds: '3' }).rounds, 3);
  assert.equal(normalizeSettings({ rounds: 'tres' }).rounds, DEFAULT_SETTINGS.rounds);
  assert.equal(normalizeSettings({ rounds: Infinity }).rounds, DEFAULT_SETTINGS.rounds);
});

test('un objeto con __proto__ o constructor no contamina ni se cuela', () => {
  const evil = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"x":1},"mode":"shortPhrase"}');
  const fixed = normalizeSettings(evil);
  assert.equal(fixed.mode, 'shortPhrase');
  assert.equal(/** @type {any} */ ({}).polluted, undefined);
  assert.deepEqual(Object.keys(fixed).sort(), Object.keys(DEFAULT_SETTINGS).sort());
});

test('guardar y cargar devuelve lo mismo (clave versionada v1)', () => {
  const storage = createMemoryStorage();
  restore = useStorage(storage);
  /** @type {import('../js/storage.js').Settings} */
  const settings = { ...DEFAULT_SETTINGS, mode: 'longPhrase', rounds: 3 };
  saveSettings(settings);
  assert.match(STORAGE_KEY, /:v1$/);
  assert.ok(storage.getItem(STORAGE_KEY));
  assert.deepEqual(loadSettings(), settings);
});

test('un objeto v1 real guardado antes se sigue leyendo', () => {
  const storage = createMemoryStorage();
  restore = useStorage(storage);
  storage.setItem(STORAGE_KEY, '{"mode":"letters","level":"medium","rounds":5,"voice":true,"sound":true}');
  assert.deepEqual(loadSettings(), { ...DEFAULT_SETTINGS, mode: 'letters', level: 'medium' });
});

test('JSON corrupto o localStorage que falla no rompen el juego', () => {
  const storage = createMemoryStorage();
  restore = useStorage(storage);
  storage.setItem(STORAGE_KEY, '{esto no es json');
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  restore();

  restore = useStorage(createMemoryStorage({ failing: true }));
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  assert.doesNotThrow(() => saveSettings(DEFAULT_SETTINGS));
});

test('sin localStorage (undefined) también funciona', () => {
  restore = useStorage(/** @type {any} */ (undefined));
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  assert.doesNotThrow(() => saveSettings(DEFAULT_SETTINGS));
});
