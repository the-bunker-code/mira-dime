/**
 * Pruebas de spanish.js: la voz y las piezas son un modelo que la niña imita,
 * así que cada sílaba debe salir como la enseñan en la escuela.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { capitalize, isSpanishWord, normalizeWord, splitLetters, splitWords, syllabify } from '../js/spanish.js';
import { BUILTIN_OBJECTS } from '../js/config.js';

/** Palabra → sílabas esperadas. Cubre cada regla del separador. */
const CASES = {
  // V-CV
  casa: 'ca-sa',
  pelota: 'pe-lo-ta',
  mesa: 'me-sa',
  oso: 'o-so',
  // dígrafos: ch, ll, rr, qu, gu
  perro: 'pe-rro',
  silla: 'si-lla',
  caballo: 'ca-ba-llo',
  chocolate: 'cho-co-la-te',
  cuchara: 'cu-cha-ra',
  queso: 'que-so',
  guitarra: 'gui-ta-rra',
  // VC-CV
  manzana: 'man-za-na',
  ventana: 'ven-ta-na',
  árbol: 'ár-bol',
  // grupos inseparables: V-CCV y VC-CCV
  libro: 'li-bro',
  plátano: 'plá-ta-no',
  hombre: 'hom-bre',
  estrella: 'es-tre-lla',
  bicicleta: 'bi-ci-cle-ta',
  // VCC-CV
  instante: 'ins-tan-te',
  transporte: 'trans-por-te',
  // diptongos e hiatos
  aeropuerto: 'a-e-ro-puer-to',
  agua: 'a-gua',
  paraguas: 'pa-ra-guas',
  hielo: 'hie-lo',
  zanahoria: 'za-na-ho-ria',
  televisión: 'te-le-vi-sión',
  avión: 'a-vión',
  día: 'dí-a',
  búho: 'bú-ho',
  leer: 'le-er',
  pingüino: 'pin-güi-no',
  cigüeña: 'ci-güe-ña',
  // h y x entre vocales
  ahora: 'a-ho-ra',
  cohete: 'co-he-te',
  examen: 'e-xa-men',
  // y como vocal o consonante
  rey: 'rey',
  muy: 'muy',
  yoyo: 'yo-yo',
  playa: 'pla-ya',
  // una sílaba y finales con consonante
  sol: 'sol',
  tren: 'tren',
  flor: 'flor',
  reloj: 're-loj',
  pájaro: 'pá-ja-ro',
};

for (const [word, expected] of Object.entries(CASES)) {
  test(`sílabas: ${word} → ${expected}`, () => {
    assert.equal(syllabify(word).join('-'), expected);
  });
}

test('las sílabas siempre vuelven a formar la palabra', () => {
  for (const word of [...Object.keys(CASES), ...BUILTIN_OBJECTS.map((object) => object.word)]) {
    assert.equal(syllabify(word).join(''), normalizeWord(word), word);
  }
});

test('mayúsculas, signos y espacios no cambian el resultado', () => {
  assert.deepEqual(syllabify('¡PELOTA!'), ['pe', 'lo', 'ta']);
  assert.deepEqual(syllabify('  Casa '), ['ca', 'sa']);
});

test('una palabra sin vocales vuelve entera; vacía, sin piezas', () => {
  assert.deepEqual(syllabify('psst'), ['psst']);
  assert.deepEqual(syllabify(''), []);
  assert.deepEqual(syllabify('¡!'), []);
});

test('letras: una por pieza, "ll" son dos letras', () => {
  assert.deepEqual(splitLetters('Llave'), ['l', 'l', 'a', 'v', 'e']);
  assert.deepEqual(splitLetters('niño'), ['n', 'i', 'ñ', 'o']);
});

test('palabras de una frase, sin signos ni mayúsculas', () => {
  assert.deepEqual(splitWords('¡El gato  duerme!'), ['el', 'gato', 'duerme']);
  assert.deepEqual(splitWords('   '), []);
});

test('isSpanishWord solo acepta letras del español', () => {
  assert.ok(isSpanishWord('pingüino'));
  assert.ok(isSpanishWord('ñandú'));
  assert.ok(!isSpanishWord('pelota roja'));
  assert.ok(!isSpanishWord('<img>'));
  assert.ok(!isSpanishWord('casa1'));
  assert.ok(!isSpanishWord(''));
});

test('capitalize pone mayúscula inicial y respeta el vacío', () => {
  assert.equal(capitalize('pelota'), 'Pelota');
  assert.equal(capitalize('árbol'), 'Árbol');
  assert.equal(capitalize(''), '');
});
