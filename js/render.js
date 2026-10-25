/**
 * render.js — Dibuja la pantalla a partir del estado. Solo lee `state`.
 * Arma HTML con template strings y lo pone zona por zona con updateZone (dom.js).
 * Las palabras de los objetos de casa las escribió una persona o la IA: van
 * siempre por escapeHTML. Lo demás sale de config.js.
 * ¿Por qué alcanza sin framework? La pantalla es chica (unas 10 zonas), el
 * estado cambia pocas veces por segundo y cada zona se redibuja entera en
 * menos de un milisegundo.
 */

import { GENERAL_TIPS, LEVELS, MODES, THEMES, levelById, modeById } from './config.js';
import { escapeHTML, updateZone } from './dom.js';
import { icon } from './icons.js';
import { mascotSVG } from './mascot.js';
import { resultPhrase } from './rules.js';

/** @typedef {import('./game.js').GameState} GameState */
/** @typedef {import('./rules.js').Round} Round */
/** @typedef {import('./config.js').GameObject} GameObject */

/**
 * Busca un elemento fijo de index.html. Si falta, es un error de programación.
 * @param {string} id
 * @returns {HTMLElement}
 */
const $ = (id) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta #${id} en index.html`);
  return element;
};

/** Punto de entrada: redibuja todo lo visible. @param {GameState} state */
export function render(state) {
  applyTheme(state);
  showScreen(state.screen);
  if (state.screen === 'home') renderHome(state);
  if (state.screen === 'game') renderGame(state);
  if (state.screen === 'end') renderEnd(state);
}

/* ---------- Tema y pantallas ---------- */

/** @param {GameState} state */
function applyTheme(state) {
  const themeName = state.screen === 'home' ? 'home' : modeById(state.settings.mode).theme;
  const theme = THEMES[themeName];
  const root = document.documentElement.style;
  root.setProperty('--theme-main', theme.main);
  root.setProperty('--theme-dark', theme.dark);
  root.setProperty('--theme-strong', theme.strong);
  root.setProperty('--theme-strong-dark', theme.strongDark);
  root.setProperty('--theme-light', theme.light);
  root.setProperty('--sky-top', theme.skyTop);
  root.setProperty('--sky-bottom', theme.skyBottom);
  root.setProperty('--hills', theme.hills);
}

/** @param {GameState['screen']} screen */
function showScreen(screen) {
  for (const name of ['home', 'game', 'end']) {
    $(`screen-${name}`).hidden = name !== screen;
  }
  // Al cambiar de pantalla, el botón que se tocó desaparece: el foco pasa a la
  // pantalla nueva para que el teclado y el lector de pantalla no se queden en <body>.
  if (screen !== shownScreen) {
    shownScreen = screen;
    $(`screen-${screen}`).focus({ preventScroll: true });
  }
}

/** Pantalla que se ve ahora (para mover el foco solo cuando cambia). */
let shownScreen = '';

/* ---------- Piezas reutilizables ---------- */

/**
 * @param {string} id
 * @param {string} mood
 */
function mascotInto(id, mood) {
  const el = $(id);
  if (el.dataset.mood !== mood) {
    el.innerHTML = mascotSVG(mood);
    el.dataset.mood = mood;
  }
}

/**
 * El dibujo del objeto: la foto de casa o el ícono de fábrica.
 * @param {GameObject} object
 */
function pictureHTML(object) {
  const word = escapeHTML(object.word);
  if (object.photo) {
    return `<img class="picture__photo" src="${escapeHTML(object.photo)}" alt="${word}" width="360" height="360">`;
  }
  if (object.drawing) {
    return `<img class="picture__drawing" src="${escapeHTML(object.drawing)}" alt="${word}" width="128" height="128">`;
  }
  return `<span class="picture__icon" role="img" aria-label="${word}">${icon('image', { size: 96, strokeWidth: 2 })}</span>`;
}

/* ---------- Inicio ---------- */

/** @param {GameState} state */
function renderHome(state) {
  mascotInto('home-mascot', 'happy');

  updateZone(
    $('level-picker'),
    LEVELS.map((level) => {
      const selected = level.id === state.settings.level;
      return `<button type="button" class="level ${selected ? 'is-selected' : ''}"
        aria-pressed="${selected}" data-action="choose-level" data-level="${level.id}">
        ${icon(level.icon, { size: 26, strokeWidth: 3 })}
        <span class="level__name">${level.name}</span>
        <span class="level__hint">${level.hint}</span>
      </button>`;
    }).join(''),
  );

  updateZone(
    $('mode-grid'),
    MODES.map((mode) => {
      const theme = THEMES[mode.theme];
      return `<button type="button" class="mode-card" data-action="start-mode" data-mode="${mode.id}"
        data-vars="--card-main:${theme.strong};--card-dark:${theme.strongDark}">
        <span class="mode-card__deco" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="mode-card__icon">${icon(mode.icon, { size: 32, strokeWidth: 3 })}</span>
        <span class="mode-card__text">
          <span class="mode-card__name">${mode.name}</span>
          <span class="mode-card__subtitle">${mode.subtitle}</span>
        </span>
      </button>`;
    }).join(''),
  );

  const count = state.savedObjects.length;
  $('objects-count').textContent = count ? `(${count})` : '';
}

/* ---------- Juego ---------- */

/** @param {GameState} state */
function renderGame(state) {
  const { round } = state;
  if (!round) return;
  const mode = modeById(round.mode);

  const avatar = $('avatar');
  mascotInto('avatar', state.mood);
  avatar.classList.toggle('is-hopping', state.hopping);

  renderProgress(state);

  updateZone(
    $('mode-chip'),
    `
    <span class="mode-chip__icon">${icon(mode.icon, { size: 18, strokeWidth: 3 })}</span>
    <span>${mode.name} · ${levelById(round.level).name}</span>`,
  );

  const question = escapeHTML(round.question);
  updateZone(
    $('question'),
    `
    <span class="question__speaker">${icon('volume-2', { size: 24 })}</span>
    <span class="question__text">${question}</span>`,
  );
  // WCAG 2.5.3: el nombre accesible debe contener el texto que se ve en el botón.
  $('question').setAttribute('aria-label', `Repetir: ${round.question}`);

  updateZone(
    $('prompt-card'),
    `<div class="picture ${state.phase === 'solved' ? 'is-done' : ''}">${pictureHTML(round.object)}</div>`,
  );
  renderSlots(state, round);
  renderTray(state, round);
  renderStatus(state, round);

  updateZone($('adult-tips'), [...mode.tips, ...GENERAL_TIPS].map((tip) => `<li>${tip}</li>`).join(''));
}

/**
 * Frase corta para lectores de pantalla (región `role=status`). Solo cambia una
 * vez por fase; el tablero entero no se anuncia en cada redibujo.
 * @param {GameState} state
 * @param {Round} round
 */
function renderStatus(state, round) {
  /** @type {Record<GameState['phase'], string>} */
  const byPhase = {
    showing: 'Mira.',
    helping: 'Esta sigue.',
    answering: `${round.question} Van ${state.placed} de ${round.units.length}.`,
    solved: resultPhrase(round),
    saying: 'Ahora dilo tú.',
  };
  const status = $('status');
  if (status.textContent !== byPhase[state.phase]) status.textContent = byPhase[state.phase];
}

/** @param {GameState} state */
function renderProgress(state) {
  const roundDone = state.phase === 'solved' || state.phase === 'saying';
  const done = state.roundNumber - 1 + (roundDone ? 1 : 0);
  const percent = Math.round((done / state.totalRounds) * 100);
  const bar = $('progress');
  bar.setAttribute('aria-valuenow', String(done));
  bar.setAttribute('aria-valuemax', String(state.totalRounds));
  updateZone(
    bar,
    `
    <span class="progress__fill" data-vars="--progress:${percent}%"></span>
    <span class="progress__text">${state.roundNumber} / ${state.totalRounds}</span>`,
  );
}

/**
 * Las casillas sobre la mesa de madera. Las llenas muestran su pieza; la que
 * sigue tiene borde del tema; con guía, las vacías muestran la pieza tenue.
 * @param {GameState} state
 * @param {Round} round
 */
function renderSlots(state, round) {
  const isPhrase = round.mode === 'shortPhrase' || round.mode === 'longPhrase';
  const slots = round.units.map((unit, i) => {
    const text = escapeHTML(unit);
    if (i < state.placed) {
      const landing = i === state.placed - 1 ? 'is-landing' : '';
      return `<span class="slot is-filled ${landing}">${text}</span>`;
    }
    const next = i === state.placed ? 'is-next' : '';
    const guide = round.guide ? `<span class="slot__guide" aria-hidden="true">${text}</span>` : '';
    return `<span class="slot ${next}">${guide}</span>`;
  });
  const table = $('table');
  table.className = `table ${isPhrase ? 'table--words' : ''}`;
  updateZone(table, `<div class="slots" data-vars="--slots:${slots.length}">${slots.join('')}</div>`);
}

/* ---------- Bandeja: piezas para elegir o "Lo dijo" ---------- */

/**
 * @param {GameState} state
 * @param {Round} round
 */
function renderTray(state, round) {
  const tray = $('tray');
  const waiting = state.phase === 'showing' || state.phase === 'helping';

  if (state.phase === 'saying' || (state.phase === 'solved' && state.placed === round.units.length)) {
    const disabled = state.phase !== 'saying';
    tray.className = `tray tray--said ${disabled ? 'tray--waiting' : ''}`;
    updateZone(
      tray,
      `<button type="button" class="chunky said-button said-button--yes" data-action="said" data-value="yes"
        aria-disabled="${disabled}">${icon('check', { size: 28, strokeWidth: 3 })} Lo dijo</button>
      <button type="button" class="chunky said-button" data-action="said" data-value="no"
        aria-disabled="${disabled}">${icon('arrow-right', { size: 28, strokeWidth: 3 })} Seguir</button>`,
    );
    return;
  }

  tray.className = `tray ${waiting ? 'tray--waiting' : ''}`;
  const isPhrase = round.mode === 'shortPhrase' || round.mode === 'longPhrase';
  const html = state.bank
    .map((value) => {
      const classes = ['chunky', 'piece'];
      if (isPhrase) classes.push('piece--word');
      if (state.pulseValue === value) classes.push('is-pulsing');
      if (state.shake?.value === value) classes.push('is-nudged');
      const disabled = state.phase !== 'answering';
      const text = escapeHTML(value);
      return `<button type="button" class="${classes.join(' ')}" data-action="choose-piece"
        data-value="${text}" aria-disabled="${disabled}" aria-label="${text}">${text}</button>`;
    })
    .join('');
  updateZone(tray, html);
  applyColumns(tray, state.bank.length);
}

/**
 * Columnas de la bandeja según cuántas piezas hay (2 a 4).
 * @param {HTMLElement} tray
 * @param {number} count
 */
function applyColumns(tray, count) {
  tray.style.setProperty('--pieces', String(Math.max(count, 1)));
}

/* ---------- Final ---------- */

/** @param {GameState} state */
function renderEnd(state) {
  mascotInto('end-mascot', 'happy');
  updateZone(
    $('end-stars'),
    Array.from({ length: state.totalRounds }, () =>
      icon('star', { size: 44, fill: 'currentColor', strokeWidth: 2 }),
    ).join(''),
  );
  $('end-stars').setAttribute('aria-label', `${state.totalRounds} estrellas`);
  $('end-stars').setAttribute('role', 'img');
  $('end-said').textContent = `Lo dijo en ${state.saidCount} de ${state.totalRounds} rondas.`;
  $('end-buttons').classList.toggle('is-visible', state.endButtonsVisible);
}
