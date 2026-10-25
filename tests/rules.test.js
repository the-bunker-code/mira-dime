/**
 * Pruebas de rules.js: objetos de la sesión, piezas y banco.
 * Usan una semilla fija (tests/helpers.js) para que el azar sea repetible.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BUILTIN_OBJECTS, LEVELS, LEVEL_RULES, MAX_PHRASE_WORDS, MODES } from '../js/config.js';
import {
  createRound,
  fitsLevel,
  initialBank,
  nextBank,
  planSession,
  resultPhrase,
  shuffle,
  targetOf,
  unitPhrase,
  unitsOf,
} from '../js/rules.js';
import { seededRandom } from './helpers.js';

/** @typedef {import('../js/config.js').GameObject} GameObject */

/** @type {GameObject} */
const PELOTA = {
  id: 'casa-pelota',
  word: 'pelota',
  shortPhrase: 'la pelota',
  longPhrase: 'la pelota es roja',
};

test('shuffle no pierde ni inventa elementos y no toca el original', () => {
  const items = [1, 2, 3, 4, 5];
  const mixed = shuffle(items, seededRandom(1));
  assert.deepEqual([...mixed].sort(), items);
  assert.deepEqual(items, [1, 2, 3, 4, 5]);
});

test('piezas de cada modo', () => {
  assert.deepEqual(unitsOf(PELOTA, 'syllables'), ['pe', 'lo', 'ta']);
  assert.deepEqual(unitsOf(PELOTA, 'letters'), ['p', 'e', 'l', 'o', 't', 'a']);
  assert.deepEqual(unitsOf(PELOTA, 'shortPhrase'), ['la', 'pelota']);
  assert.deepEqual(unitsOf(PELOTA, 'longPhrase'), ['la', 'pelota', 'es', 'roja']);
  assert.equal(targetOf(PELOTA, 'letters'), 'pelota');
  assert.equal(targetOf(PELOTA, 'longPhrase'), 'la pelota es roja');
});

test('una frase de más de 4 palabras no se usa (la voz no dice más de 4)', () => {
  const long = { ...PELOTA, longPhrase: 'la pelota es muy roja' };
  assert.deepEqual(unitsOf(long, 'longPhrase'), []);
  assert.equal(MAX_PHRASE_WORDS, 4);
});

test('cada modo y nivel tiene al menos un objeto de fábrica que sirve', () => {
  for (const mode of MODES) {
    for (const level of LEVELS) {
      const fitting = BUILTIN_OBJECTS.filter((object) => fitsLevel(object, mode.id, level.id));
      assert.ok(fitting.length >= 2, `${mode.id}/${level.id}: ${fitting.length} objetos`);
    }
  }
});

test('el banco nunca muestra más de 4 piezas ni menos de 2 al empezar', () => {
  for (const mode of MODES) {
    for (const level of LEVELS) {
      const { bank } = LEVEL_RULES[mode.id][level.id];
      assert.ok(bank >= 2 && bank <= 4, `${mode.id}/${level.id}`);
    }
  }
});

test('la sesión usa objetos que sirven, distintos mientras alcancen', () => {
  const settings = /** @type {const} */ ({ mode: 'syllables', level: 'easy', rounds: 5 });
  const plan = planSession(BUILTIN_OBJECTS, settings, { random: seededRandom(3) });
  assert.equal(plan.length, 5);
  assert.equal(new Set(plan.map((object) => object.id)).size, 5);
  for (const object of plan) assert.ok(fitsLevel(object, 'syllables', 'easy'), object.word);
});

test('con pocos objetos se repiten, pero nunca dos rondas seguidas', () => {
  const two = BUILTIN_OBJECTS.filter((object) => ['casa', 'gato'].includes(object.id));
  const plan = planSession(two, { mode: 'syllables', level: 'easy', rounds: 8 }, { random: seededRandom(5) });
  assert.equal(plan.length, 8);
  for (let i = 1; i < plan.length; i++) assert.notEqual(plan[i].id, plan[i - 1].id);
});

test('con un solo objeto se repite (no queda sin rondas)', () => {
  const plan = planSession([PELOTA], { mode: 'syllables', level: 'medium', rounds: 3 });
  assert.deepEqual(
    plan.map((object) => object.id),
    ['casa-pelota', 'casa-pelota', 'casa-pelota'],
  );
});

test('la foto recién guardada abre la sesión si sirve para el nivel', () => {
  const objects = [PELOTA, ...BUILTIN_OBJECTS];
  const plan = planSession(objects, { mode: 'syllables', level: 'medium', rounds: 3 }, { firstId: 'casa-pelota' });
  assert.equal(plan[0].id, 'casa-pelota');
  const other = planSession(objects, { mode: 'syllables', level: 'easy', rounds: 3 }, { firstId: 'casa-pelota' });
  assert.notEqual(other[0].id, 'casa-pelota', 'pelota tiene 3 sílabas: no es del nivel 1');
});

test('si ningún objeto sirve, se usan los más cercanos al nivel', () => {
  // Solo palabras de 1 sílaba, pero el nivel pide 4 o más.
  const short = BUILTIN_OBJECTS.filter((object) => ['sol', 'pez', 'casa'].includes(object.id));
  const plan = planSession(short, { mode: 'syllables', level: 'hard', rounds: 2 }, { random: seededRandom(2) });
  assert.deepEqual(
    plan.map((object) => object.id),
    ['casa', 'casa'],
  );
});

test('sin objetos usables la sesión queda vacía (el juego vuelve al inicio)', () => {
  const noPhrase = { ...PELOTA, shortPhrase: '' };
  assert.deepEqual(planSession([noPhrase], { mode: 'shortPhrase', level: 'easy', rounds: 3 }), []);
});

test('la ronda: consigna, guía y banco según el nivel', () => {
  const word = createRound(PELOTA, { mode: 'syllables', level: 'medium' });
  assert.equal(word.question, 'Armemos pelota.');
  assert.equal(word.guide, true);
  assert.equal(word.bankSize, 3);
  assert.ok(Object.isFrozen(word));
  const phrase = createRound(PELOTA, { mode: 'longPhrase', level: 'hard' });
  assert.equal(phrase.question, 'La pelota es roja.');
  assert.equal(phrase.guide, false);
  assert.equal(resultPhrase(phrase), '¡La pelota es roja!');
  assert.equal(resultPhrase(word), '¡Pelota!');
});

test('el banco empieza con la pieza que sigue, sin repetidas y sin pasarse', () => {
  for (let seed = 1; seed < 30; seed++) {
    const bank = initialBank(['p', 'a', 'p', 'a'], 4, seededRandom(seed));
    assert.ok(bank.includes('p'));
    assert.equal(new Set(bank).size, bank.length);
    assert.deepEqual([...bank].sort(), ['a', 'p']);
  }
  assert.equal(initialBank(['pe', 'lo', 'ta'], 2, seededRandom(4)).length, 2);
  assert.deepEqual(initialBank([], 3, seededRandom(4)), []);
});

test('tras un acierto las demás piezas no se mueven; la que sigue siempre está', () => {
  const units = ['bi', 'ci', 'cle', 'ta'];
  const random = seededRandom(9);
  let bank = initialBank(units, 3, random);
  for (let placed = 0; placed < units.length; placed++) {
    assert.ok(bank.includes(units[placed]), `falta ${units[placed]} en ${bank}`);
    const tapped = bank.indexOf(units[placed]);
    const before = bank;
    bank = nextBank(bank, tapped, units.slice(placed + 1), 3, random);
    before.forEach((text, i) => {
      if (i !== tapped && i < bank.length && units.slice(placed + 1).includes(text)) {
        assert.equal(bank[i], text, 'una pieza que no se tocó cambió de lugar');
      }
    });
    assert.ok(bank.length <= 3);
  }
  assert.deepEqual(bank, []);
});

test('con piezas repetidas ("papa") la tocada se queda si todavía falta', () => {
  // Faltan p,a,p,a; banco [p, a]; toca la p (posición 0); faltan a,p,a.
  assert.deepEqual(nextBank(['p', 'a'], 0, ['a', 'p', 'a'], 2, seededRandom(1)), ['p', 'a']);
});

test('si la que sigue no está y no hay lugar libre, reemplaza a la tocada', () => {
  // Banco lleno de piezas que se repiten; la siguiente (x) no estaba.
  assert.deepEqual(nextBank(['a', 'b'], 0, ['x', 'a', 'b'], 2, seededRandom(1)), ['x', 'b']);
});

test('las piezas se dicen en minúscula (la voz no deletrea como sigla)', () => {
  assert.equal(unitPhrase('PE'), 'pe');
});
