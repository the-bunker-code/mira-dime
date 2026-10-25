/**
 * settings-panel.js — El panel "Ajustes para adultos" (<dialog> nativo).
 * Trabaja sobre una COPIA de los ajustes: lo que el adulto toca no cambia
 * el juego hasta que pulsa "Guardar y empezar". Por eso "Cancelar" no tiene
 * que deshacer nada. Si se cierra sin guardar a mitad de una sesión, el
 * juego vuelve al inicio (la ronda ya quedó cortada al abrir el panel).
 */

import { LEVELS, MODES, ROUND_OPTIONS } from './config.js';
import { goHome, pauseForSettings, startGame, state, updateSettings } from './game.js';
import { normalizeSettings } from './storage.js';

/**
 * Secciones del panel: cada una es un grupo de "pastillas".
 * @type {Array<{ key: keyof import('./storage.js').Settings, legend: string, options: Array<{ value: string | number | boolean, label: string }> }>}
 */
const SECTIONS = [
  { key: 'mode', legend: 'Modo', options: MODES.map((m) => ({ value: m.id, label: m.name })) },
  { key: 'level', legend: 'Nivel', options: LEVELS.map((l) => ({ value: l.id, label: l.name })) },
  { key: 'rounds', legend: 'Rondas por sesión', options: ROUND_OPTIONS.map((n) => ({ value: n, label: String(n) })) },
  {
    key: 'voice',
    legend: 'Voz',
    options: [
      { value: true, label: 'Sí' },
      { value: false, label: 'No' },
    ],
  },
  {
    key: 'sound',
    legend: 'Sonidos',
    options: [
      { value: true, label: 'Sí' },
      { value: false, label: 'No' },
    ],
  },
];

/** Copia de los ajustes que el adulto está editando (null con el panel cerrado). */
/** @type {import('./storage.js').Settings | null} */
let draft = null;
/** @type {HTMLDialogElement} */
let dialog;

/**
 * Busca un elemento fijo de index.html. Si falta, es un error de programación.
 * @template {HTMLElement} T
 * @param {string} id
 * @param {new () => T} type
 * @returns {T}
 */
function getElement(id, type) {
  const element = document.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Falta #${id} en index.html`);
  return element;
}

/** Prepara el panel una sola vez, al arrancar. */
export function setupSettingsPanel() {
  dialog = getElement('settings', HTMLDialogElement);
  const form = getElement('settings-form', HTMLFormElement);

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !draft) return;
    const section = SECTIONS.find((s) => s.key === input.name);
    const option = section?.options.find((o) => String(o.value) === input.value);
    if (option) draft = { ...draft, [input.name]: option.value };
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const saved = normalizeSettings(draft);
    closeWithoutSideEffects();
    updateSettings(saved);
    startGame(saved.mode);
  });

  form.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-settings]') : null;
    if (!(button instanceof HTMLElement)) return;
    if (button.dataset.settings === 'home') {
      closeWithoutSideEffects();
      goHome();
    }
    if (button.dataset.settings === 'cancel') closeWithoutSaving();
  });

  // Tecla Escape: el navegador dispara "cancel".
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeWithoutSaving();
  });
}

/** Abre el panel con una copia de los ajustes actuales. */
export function openSettingsPanel() {
  pauseForSettings();
  draft = { ...state.settings };
  getElement('settings-fields', HTMLElement).innerHTML = SECTIONS.map(sectionHTML).join('');
  dialog.showModal();
}

function closeWithoutSideEffects() {
  draft = null;
  if (dialog.open) dialog.close();
}

function closeWithoutSaving() {
  closeWithoutSideEffects();
  // Al abrir el panel se cortó la ronda: no se puede seguir a medias.
  if (state.screen !== 'home') goHome();
}

/**
 * @param {(typeof SECTIONS)[number]} section
 * @returns {string}
 */
function sectionHTML(section) {
  const pills = section.options
    .map((option) => {
      const checked = String(draft?.[section.key]) === String(option.value);
      const id = `setting-${section.key}-${option.value}`;
      return `<input class="pill__input" type="radio" name="${section.key}" id="${id}"
        value="${option.value}" ${checked ? 'checked' : ''}>
      <label class="pill" for="${id}">${option.label}</label>`;
    })
    .join('');
  return `<fieldset class="settings__section">
      <legend class="settings__legend">${section.legend}</legend>
      <div class="settings__pills">${pills}</div>
    </fieldset>`;
}
