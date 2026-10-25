/**
 * main.js — Punto de entrada. Conecta las piezas y escucha los toques.
 * Usa delegación de eventos: un solo listener en `document` busca el botón
 * con `data-action` más cercano y llama a su manejador en ACTIONS. Así no
 * hay `onclick` repartidos por el HTML y los botones que render.js crea de
 * nuevo funcionan sin volver a registrar nada.
 */

import { chooseLevel, choosePiece, confirmSaid, goHome, onChange, repeatQuestion, startGame, state } from './game.js';
import { hydrateIcons } from './icons.js';
import { setupInstall } from './install.js';
import { openObjectsPanel, setupObjectsPanel } from './objects-panel.js';
import { render } from './render.js';
import { openSettingsPanel, setupSettingsPanel } from './settings-panel.js';

/**
 * Cada acción recibe el elemento tocado y lee sus data-*. Esos valores los
 * escribe render.js, por eso los ids se tratan como válidos; las piezas se
 * comparan con las de la ronda en game.js.
 * @type {Record<string, (el: HTMLElement) => void>}
 */
const ACTIONS = {
  'start-mode': (el) => startGame(/** @type {import('./config.js').ModeId} */ (el.dataset.mode)),
  'choose-level': (el) => chooseLevel(/** @type {import('./config.js').LevelId} */ (el.dataset.level)),
  'choose-piece': (el) => choosePiece(el.dataset.value ?? ''),
  'said': (el) => confirmSaid(el.dataset.value === 'yes'),
  'repeat-question': () => repeatQuestion(),
  'open-settings': () => openSettingsPanel(),
  'open-objects': () => openObjectsPanel(),
  'go-home': () => goHome(),
  'play-again': () => startGame(state.settings.mode),
};

/** @param {MouseEvent} event */
function handleAction(event) {
  if (!(event.target instanceof Element)) return;
  const el = event.target.closest('[data-action]');
  if (!(el instanceof HTMLElement)) return;
  const handler = ACTIONS[el.dataset.action ?? ''];
  if (handler) handler(el);
}

// Todos los controles son <button>, que ya responden a Enter y Espacio con un "click".
document.addEventListener('click', handleAction);

function boot() {
  document.getElementById('boot-warning')?.remove();
  hydrateIcons();
  setupSettingsPanel();
  setupObjectsPanel();
  setupInstall();
  onChange(render);
  render(state);
}

boot();

// Offline (sw.js). Requiere contexto seguro; si falla, el juego solo pierde el modo offline.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
