/**
 * Pruebas de game.js: el estado, las esperas y los toques.
 *
 * Aislamiento: audio.js y storage.js no se reemplazan. Hablan con APIs del
 * navegador que aquí no existen o se simulan mínimamente:
 *   - speechSynthesis: un stub que anota cada frase (spoken) y termina enseguida.
 *   - localStorage: no existe en Node, así que storage.js usa los valores por defecto.
 *   - AudioContext: no existe; audio.js ya lo trata como "sin sonido".
 * Los temporizadores son simulados (mock.timers): las pruebas avanzan el reloj
 * a mano, sin esperar segundos reales.
 */

import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { TIMING } from '../js/config.js';

/** @type {string[]} */
const spoken = [];

class FakeUtterance {
  /** @param {string} text */
  constructor(text) {
    this.text = text;
    /** @type {null | (() => void)} */
    this.onend = null;
    this.onerror = null;
  }
}
Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
Object.defineProperty(globalThis, 'speechSynthesis', {
  configurable: true,
  value: {
    getVoices: () => [],
    addEventListener: () => {},
    cancel: () => {},
    /** @param {FakeUtterance} utterance */
    speak(utterance) {
      spoken.push(utterance.text);
      queueMicrotask(() => utterance.onend?.());
    },
  },
});

const game = await import('../js/game.js');
const { state } = game;

/** Deja correr las promesas pendientes (los `await` de game.js). */
async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

/**
 * Avanza el reloj simulado de a 50 ms, dejando correr las promesas en cada paso.
 * @param {number} ms
 */
async function advance(ms) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    mock.timers.tick(50);
    await flush();
  }
}

/**
 * Avanza hasta llegar a la fase pedida (o falla si tarda demasiado).
 * @param {import('../js/game.js').GameState['phase']} phase
 */
async function until(phase) {
  for (let i = 0; i < 400 && state.phase !== phase; i++) await advance(50);
  assert.equal(state.phase, phase, `la ronda llegó a "${phase}"`);
}
const untilAnswering = () => until('answering');

/** @param {Partial<import('../js/storage.js').Settings>} [overrides] */
function freshGame(overrides = {}) {
  game.goHome();
  spoken.length = 0;
  game.updateSettings({ ...state.settings, rounds: 3, level: 'easy', ...overrides });
}

/** La ronda actual (falla si no hay). */
function currentRound() {
  if (!state.round) throw new Error('no hay ronda');
  return state.round;
}

/** La pieza que sigue. */
const nextPiece = () => currentRound().units[state.placed];

/** Una pieza del banco que no es la que sigue. */
function wrongPiece() {
  const wrong = state.bank.find((piece) => piece !== nextPiece());
  if (wrong === undefined) throw new Error('el banco no tiene una pieza equivocada');
  return wrong;
}

/** Coloca todas las piezas en orden. */
function placeAll() {
  const total = currentRound().units.length;
  for (let i = 0; i < total; i++) {
    assert.ok(state.bank.includes(nextPiece()), 'la pieza que sigue está en el banco');
    game.choosePiece(nextPiece());
  }
}

beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
afterEach(() => {
  game.goHome();
  mock.timers.reset();
});

test('una sesión completa: arma, "Lo dijo", anuncia el cierre y retrasa los botones', async () => {
  freshGame({ mode: 'syllables' });
  game.startGame('syllables');

  for (let round = 1; round <= 3; round++) {
    await untilAnswering();
    assert.equal(state.roundNumber, round);
    assert.ok(spoken.includes(currentRound().question));
    placeAll();
    assert.equal(state.phase, 'solved');
    await until('saying');
    assert.equal(spoken.at(-1), 'Ahora dilo tú.');
    game.confirmSaid(round !== 2);
    await advance(TIMING.saidPause + 100);
  }

  assert.equal(state.screen, 'end');
  assert.equal(state.saidCount, 2);
  assert.equal(state.endButtonsVisible, false, 'los botones del final esperan');
  await advance(TIMING.endButtons);
  assert.equal(state.endButtonsVisible, true);

  assert.equal(spoken.filter((phrase) => phrase === 'Dos más y terminamos.').length, 1);
  assert.equal(spoken.filter((phrase) => phrase === 'La última y terminamos.').length, 1);
  assert.ok(spoken.includes('¡Lo hicimos juntos!'));
  assert.ok(spoken.includes('¡Muy bien dicho!'));
});

test('cada pieza correcta se nombra y avanza; las rondas son de objetos distintos', async () => {
  freshGame({ mode: 'syllables', level: 'medium' });
  game.startGame('syllables');
  await untilAnswering();
  const round = currentRound();
  assert.equal(round.units.length, 3);
  game.choosePiece(nextPiece());
  assert.equal(state.placed, 1);
  assert.equal(spoken.at(-1), round.units[0]);
  assert.equal(new Set(state.plan.map((object) => object.id)).size, 3);
});

test('un error nunca castiga: "¡Casi!", y al segundo seguido la ayuda marca la pieza', async () => {
  freshGame({ mode: 'syllables', level: 'medium' });
  game.startGame('syllables');
  await untilAnswering();
  const next = nextPiece();

  game.choosePiece(wrongPiece());
  assert.equal(state.phase, 'answering', 'el primer error no detiene nada');
  assert.equal(state.misses, 1);
  assert.ok(state.shake, 'la pieza se hunde un instante');
  assert.equal(spoken.at(-1), '¡Casi! Otra vez.');

  game.choosePiece(wrongPiece());
  assert.equal(state.phase, 'helping');
  assert.equal(state.mood, 'think');

  // Mientras corre la ayuda, los toques no hacen nada.
  game.choosePiece(next);
  assert.equal(state.placed, 0);

  await untilAnswering();
  assert.equal(state.pulseValue, next, 'la pieza que sigue queda marcada');
  assert.ok(spoken.includes('Esta sigue.'));
  assert.equal(state.misses, 0);

  game.choosePiece(next);
  assert.equal(state.placed, 1);
  assert.equal(state.pulseValue, null);
});

test('acertar reinicia la cuenta de fallos seguidos', async () => {
  freshGame({ mode: 'letters', level: 'hard' });
  game.startGame('letters');
  await untilAnswering();
  game.choosePiece(wrongPiece());
  game.choosePiece(nextPiece());
  assert.equal(state.misses, 0);
  game.choosePiece(wrongPiece());
  assert.equal(state.phase, 'answering', 'un solo fallo después de acertar no llama a la ayuda');
});

test('toques en ráfaga sobre la última pieza cuentan una sola vez', async () => {
  freshGame({ mode: 'shortPhrase' });
  game.startGame('shortPhrase');
  await untilAnswering();
  game.choosePiece(nextPiece());
  const last = nextPiece();
  for (let i = 0; i < 6; i++) game.choosePiece(last);
  assert.equal(state.phase, 'solved');
  assert.equal(state.placed, 2);

  await until('saying');
  for (let i = 0; i < 4; i++) game.confirmSaid(true);
  assert.equal(state.saidCount, 1, '"Lo dijo" en ráfaga cuenta una vez');
  await advance(TIMING.saidPause + 100);
  assert.equal(state.roundNumber, 2, 'avanzó una sola ronda');
});

test('una pieza que no está en el banco se ignora', async () => {
  freshGame({ mode: 'syllables' });
  game.startGame('syllables');
  await untilAnswering();
  game.choosePiece('zzz');
  assert.equal(state.misses, 0);
  assert.equal(state.placed, 0);
});

test('volver al inicio a mitad de una ronda cancela todo lo pendiente', async () => {
  freshGame({ mode: 'syllables' });
  game.startGame('syllables');
  await untilAnswering();
  placeAll();

  game.goHome();
  const spokenAtHome = spoken.length;
  await advance(30_000);

  assert.equal(state.screen, 'home');
  assert.equal(state.round, null);
  assert.equal(state.phase, 'solved', 'la tarea cancelada no llegó a "saying"');
  assert.equal(spoken.length, spokenAtHome, 'no habla después de cancelar');
});

test('abrir un panel durante la ayuda la detiene; una sesión nueva arranca limpia', async () => {
  freshGame({ mode: 'syllables', level: 'medium' });
  game.startGame('syllables');
  await untilAnswering();
  game.choosePiece(wrongPiece());
  game.choosePiece(wrongPiece());
  assert.equal(state.phase, 'helping');

  game.pauseForSettings();
  await advance(30_000);
  assert.equal(state.phase, 'helping', 'la ayuda cancelada no terminó sola');

  game.goHome();
  game.startGame('syllables');
  await untilAnswering();
  assert.equal(state.roundNumber, 1);
  assert.equal(state.misses, 0);
  assert.equal(state.placed, 0);
});

test('empezar dos veces seguidas deja una sola ronda activa', async () => {
  freshGame({ mode: 'syllables' });
  game.startGame('syllables');
  game.startGame('syllables');
  await untilAnswering();
  assert.equal(state.roundNumber, 1);
  assert.equal(spoken.filter((phrase) => phrase === currentRound().question).length, 1);
});

test('repetir la consigna solo funciona cuando le toca elegir', async () => {
  freshGame({ mode: 'syllables' });
  game.startGame('syllables');
  const before = spoken.length;
  game.repeatQuestion();
  assert.equal(spoken.length, before);

  await untilAnswering();
  const afterAuto = spoken.length;
  game.repeatQuestion();
  assert.equal(spoken.length, afterAuto + 1);
  assert.equal(spoken.at(-1), currentRound().question);
});

test('sin voz el juego funciona igual', async () => {
  freshGame({ mode: 'syllables', voice: false });
  game.startGame('syllables');
  await untilAnswering();
  placeAll();
  await until('saying');
  assert.equal(spoken.length, 0);
});

test('la foto recién guardada abre la sesión siguiente, una sola vez', async () => {
  freshGame({ mode: 'syllables', level: 'medium' });
  game.addObject({ id: 'casa-pelota', word: 'pelota', shortPhrase: 'la pelota', longPhrase: 'la pelota es roja' });
  assert.equal(state.firstObjectId, 'casa-pelota');
  game.startGame('syllables');
  assert.equal(state.plan[0].id, 'casa-pelota');
  assert.equal(state.firstObjectId, null);
  game.removeObject('casa-pelota');
  assert.equal(state.savedObjects.length, 0);
});

test('quitar el objeto pendiente también lo saca del inicio de la próxima sesión', () => {
  freshGame();
  game.addObject({ id: 'casa-taza', word: 'taza', shortPhrase: 'la taza', longPhrase: '' });
  game.removeObject('casa-taza');
  assert.equal(state.firstObjectId, null);
});

test('chooseLevel guarda el nivel y no inicia nada', () => {
  freshGame();
  game.chooseLevel('hard');
  assert.equal(state.settings.level, 'hard');
  assert.equal(state.screen, 'home');
});
