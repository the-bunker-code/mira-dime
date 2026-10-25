/**
 * game.js — El estado del juego y las acciones que lo cambian.
 * Es el único archivo que modifica `state`. La interfaz (main.js) solo llama
 * acciones, y render.js solo lee el estado. Después de cada cambio se llama
 * a notify(), que avisa a quien esté escuchando (el render).
 * Aquí también viven las secuencias con espera: la consigna, la ayuda, el
 * "ahora dilo tú" y la pausa entre rondas.
 */

import { BUILTIN_OBJECTS, MISSES_BEFORE_HELP, TEXT, TIMING } from './config.js';
import { createRound, initialBank, nextBank, planSession, resultPhrase, unitPhrase } from './rules.js';
import {
  configureAudio,
  playCountTone,
  playSoftErrorTone,
  playSuccessTone,
  say,
  stopSpeaking,
  unlockAudio,
} from './audio.js';
import { loadSettings, normalizeSettings, saveSettings } from './storage.js';
import { loadObjects, saveObjects } from './objects.js';

/** @typedef {import('./rules.js').Round} Round */
/** @typedef {import('./config.js').GameObject} GameObject */

/**
 * El estado completo.
 * @typedef {Object} GameState
 * @property {'home'|'game'|'end'} screen
 * @property {import('./storage.js').Settings} settings
 * @property {GameObject[]} savedObjects  Objetos de casa, los más nuevos primero.
 * @property {string|null} firstObjectId  Foto recién guardada: abre la próxima sesión.
 * @property {GameObject[]} plan          Objetos de la sesión, en orden.
 * @property {number} roundNumber         Ronda actual, desde 1.
 * @property {number} totalRounds
 * @property {Round|null} round
 * @property {'showing'|'answering'|'helping'|'solved'|'saying'} phase
 * @property {number} placed              Piezas ya colocadas en la ronda.
 * @property {string[]} bank              Piezas que se ven para elegir.
 * @property {number} misses              Fallos seguidos (vuelve a 0 al acertar).
 * @property {string|null} pulseValue     Pieza que la ayuda marca.
 * @property {{ value: string, nonce: number }|null} shake  Pieza que se hunde un instante.
 * @property {boolean} hopping            El avatar salta (acierto).
 * @property {'idle'|'think'|'happy'} mood
 * @property {number} saidCount           Rondas en que el adulto marcó "Lo dijo".
 * @property {boolean} endButtonsVisible
 */

/** @type {GameState} */
export const state = {
  screen: 'home',
  settings: loadSettings(),
  savedObjects: loadObjects(),
  firstObjectId: null,
  plan: [],
  roundNumber: 0,
  totalRounds: 0,
  round: null,
  phase: 'showing',
  placed: 0,
  bank: [],
  misses: 0,
  pulseValue: null,
  shake: null,
  hopping: false,
  mood: 'happy',
  saidCount: 0,
  endButtonsVisible: false,
};

configureAudio(state.settings);

/* ---------- Avisos de cambio ---------- */

const listeners = new Set();

/**
 * Registra una función que se llama cada vez que cambia el estado.
 * @param {(state: GameState) => void} listener
 */
export function onChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener(state));
}

/* ---------- Tareas con espera que se cancelan solas ----------
 * La ronda, la ayuda y el final usan `await wait(ms)`. Si mientras esperan la
 * niña vuelve al inicio o el adulto abre un panel, esa tarea ya no sirve.
 * Para eso existe `roundId`: sube al empezar una ronda, al volver al inicio y
 * al abrir un panel. Cada tarea guarda el número con el que empezó y,
 * después de cada espera, pregunta `isStale(id)`. Si el número cambió, la
 * tarea termina sin tocar nada. Así no quedan voces ni animaciones sueltas.
 */
let roundId = 0;
/** @param {number} id */
const isStale = (id) => id !== roundId;
/** @param {number} ms */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nonce = 0;

/** Objetos de casa primero, después los de fábrica. */
export function allObjects() {
  return [...state.savedObjects, ...BUILTIN_OBJECTS];
}

/* ---------- Acciones públicas ---------- */

/**
 * Cambia el nivel desde la pantalla de inicio y lo guarda.
 * @param {import('./config.js').LevelId} level
 */
export function chooseLevel(level) {
  updateSettings({ ...state.settings, level });
}

/**
 * Empieza una sesión con el modo elegido.
 * @param {import('./config.js').ModeId} [mode]
 */
export function startGame(mode = state.settings.mode) {
  unlockAudio();
  updateSettings({ ...state.settings, mode });
  state.plan = planSession(allObjects(), state.settings, { firstId: state.firstObjectId });
  state.firstObjectId = null;
  state.screen = 'game';
  state.roundNumber = 1;
  state.totalRounds = state.plan.length;
  state.saidCount = 0;
  playRound();
}

/** Vuelve al inicio y cancela todo lo pendiente. */
export function goHome() {
  roundId++;
  stopSpeaking();
  state.screen = 'home';
  state.round = null;
  state.mood = 'happy';
  state.endButtonsVisible = false;
  notify();
}

/**
 * Repite la consigna en voz alta (globo con altavoz).
 * Solo cuando le toca elegir: say() corta la frase que esté sonando, y
 * durante la ayuda esa frase es la información que ella necesita.
 */
export function repeatQuestion() {
  if (state.round && state.phase === 'answering') say(state.round.question);
}

/** El adulto abrió un panel: se detiene todo lo que estaba en curso. */
export function pauseForSettings() {
  roundId++;
  stopSpeaking();
}

/**
 * Guarda ajustes nuevos (ya validados por normalizeSettings).
 * @param {import('./storage.js').Settings} next
 */
export function updateSettings(next) {
  state.settings = normalizeSettings(next);
  configureAudio(state.settings);
  saveSettings(state.settings);
  notify();
}

/**
 * Guarda un objeto de casa nuevo. Abre la próxima sesión.
 * @param {GameObject} object
 */
export function addObject(object) {
  state.savedObjects = saveObjects([object, ...state.savedObjects]);
  state.firstObjectId = state.savedObjects.some((saved) => saved.id === object.id) ? object.id : null;
  notify();
}

/** @param {string} id */
export function removeObject(id) {
  state.savedObjects = saveObjects(state.savedObjects.filter((object) => object.id !== id));
  if (state.firstObjectId === id) state.firstObjectId = null;
  notify();
}

/**
 * La niña tocó una pieza del banco.
 * @param {string} value
 */
export function choosePiece(value) {
  const { round } = state;
  if (state.phase !== 'answering' || !round) return;
  const position = state.bank.indexOf(value);
  if (position === -1) return;
  if (value === round.units[state.placed]) {
    handleCorrect(round, value, position);
  } else {
    handleMistake(round, value);
  }
}

/**
 * El adulto marcó si lo dijo, o tocó "Seguir".
 * @param {boolean} said
 */
export function confirmSaid(said) {
  if (state.phase !== 'saying') return;
  finishRound(said);
}

/* ---------- Una ronda ---------- */

async function playRound() {
  const id = ++roundId;
  const object = state.plan[state.roundNumber - 1];
  if (!object) {
    goHome();
    return;
  }
  const round = createRound(object, state.settings);
  Object.assign(state, {
    round,
    phase: 'showing',
    placed: 0,
    bank: initialBank(round.units, round.bankSize, Math.random),
    misses: 0,
    pulseValue: null,
    shake: null,
    hopping: false,
    mood: 'idle',
  });
  notify();

  // Anticipar el cierre, como "en dos canciones guardamos".
  const roundsLeft = state.totalRounds - state.roundNumber + 1;
  if (roundsLeft === 2 && state.totalRounds > 2) await say(TEXT.twoMore);
  if (roundsLeft === 1 && state.totalRounds > 1) await say(TEXT.lastOne);
  if (isStale(id)) return;

  await wait(TIMING.beforeShow);
  if (isStale(id)) return;

  state.phase = 'answering';
  notify();
  say(round.question);
}

/* ---------- Acierto ---------- */

/**
 * @param {Round} round
 * @param {string} value
 * @param {number} position
 */
function handleCorrect(round, value, position) {
  state.placed++;
  state.misses = 0;
  state.pulseValue = null;
  state.shake = null;
  state.bank = nextBank(state.bank, position, round.units.slice(state.placed), round.bankSize, Math.random);
  playCountTone(state.placed);

  if (state.placed < round.units.length) {
    say(unitPhrase(value));
    notify();
    return;
  }
  solveRound(round);
}

/** @param {Round} round */
async function solveRound(round) {
  const id = roundId;
  state.phase = 'solved';
  state.mood = 'happy';
  state.hopping = true;
  playSuccessTone();
  notify();

  setTimeout(() => {
    if (isStale(id)) return;
    state.hopping = false;
    notify();
  }, TIMING.hop);

  await say(resultPhrase(round));
  if (isStale(id)) return;
  await Promise.all([say(TEXT.great), wait(TIMING.nextRound)]);
  if (isStale(id)) return;

  state.phase = 'saying';
  notify();
  say(TEXT.sayIt);
}

/** @param {boolean} said */
async function finishRound(said) {
  const id = roundId;
  state.phase = 'solved';
  if (said) {
    state.saidCount++;
    playSuccessTone();
  }
  notify();
  await Promise.all([said ? say(TEXT.saidIt) : Promise.resolve(), wait(TIMING.saidPause)]);
  if (isStale(id)) return;

  if (state.roundNumber < state.totalRounds) {
    state.roundNumber++;
    playRound();
  } else {
    endSession();
  }
}

/* ---------- Error: nunca castiga ---------- */

/**
 * @param {Round} round
 * @param {string} value
 */
function handleMistake(round, value) {
  playSoftErrorTone();
  state.misses++;
  state.shake = { value, nonce: ++nonce };
  const shakeNonce = state.shake.nonce;
  notify();
  setTimeout(() => {
    if (state.shake?.nonce !== shakeNonce) return;
    state.shake = null;
    notify();
  }, TIMING.shake);

  if (state.misses >= MISSES_BEFORE_HELP) {
    runHelp(round);
  } else {
    say(TEXT.almost);
  }
}

/**
 * La ayuda: la mascota piensa, la voz dice "Esta sigue." y la pieza correcta
 * queda marcada con borde dorado. Mientras dura, las piezas no responden.
 * @param {Round} round
 */
async function runHelp(round) {
  const id = roundId;
  const next = round.units[state.placed];
  state.phase = 'helping';
  state.mood = 'think';
  notify();
  await wait(TIMING.shake + 150);
  if (isStale(id)) return;

  state.pulseValue = next;
  notify();
  await say(TEXT.next);
  if (isStale(id)) return;
  await Promise.all([say(unitPhrase(next)), wait(TIMING.helpStep)]);
  if (isStale(id)) return;

  state.misses = 0;
  state.phase = 'answering';
  state.mood = 'idle';
  notify();
}

/* ---------- Final ---------- */

async function endSession() {
  const id = ++roundId;
  state.screen = 'end';
  state.mood = 'happy';
  state.endButtonsVisible = false;
  notify();
  say(TEXT.endSpeech);
  await wait(TIMING.endButtons);
  if (isStale(id)) return;
  state.endButtonsVisible = true;
  notify();
}
