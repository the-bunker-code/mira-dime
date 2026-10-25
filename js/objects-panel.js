/**
 * objects-panel.js — El panel "Objetos de casa" (<dialog> nativo, solo adultos).
 * El adulto saca una foto; mientras la IA la mira, puede escribir la palabra
 * él mismo (o cancelar). Nada se guarda hasta que toca "Guardar".
 * La niña nunca ve esta espera: el panel se abre desde el inicio.
 */

import { PHOTO_MESSAGES } from './config.js';
import { escapeHTML } from './dom.js';
import { addObject, pauseForSettings, removeObject, state } from './game.js';
import { icon } from './icons.js';
import { newObjectId, normalizeObject, normalizePhrase } from './objects.js';
import { describePhoto, preparePhoto } from './photo.js';
import { syllabify } from './spanish.js';

/** @type {HTMLDialogElement} */
let dialog;
/** @type {HTMLFormElement} */
let form;
/** Miniatura de la foto en edición ('' sin foto). */
let draftPhoto = '';
/** @type {AbortController|null} */
let request = null;
/** @type {ReturnType<typeof setInterval>|undefined} */
let ticker;

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

/** @param {string} name */
const field = (name) => getElement(`object-${name}`, HTMLInputElement);

/** Prepara el panel una sola vez, al arrancar. */
export function setupObjectsPanel() {
  dialog = getElement('objects', HTMLDialogElement);
  form = getElement('objects-form', HTMLFormElement);

  getElement('objects-file', HTMLInputElement).addEventListener('change', (event) => {
    const input = /** @type {HTMLInputElement} */ (event.target);
    const file = input.files?.[0];
    input.value = ''; // permite elegir la misma foto otra vez
    if (file) handlePhoto(file);
  });

  field('word').addEventListener('input', renderSyllables);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveDraft();
  });

  form.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-objects]') : null;
    if (!(button instanceof HTMLElement)) return;
    const action = button.dataset.objects;
    if (action === 'manual') writeManually();
    if (action === 'cancel') cancelRequest(PHOTO_MESSAGES.cancelled);
    if (action === 'discard') closeEditor();
    if (action === 'close') closePanel();
    if (action === 'remove' && button.dataset.id) {
      removeObject(button.dataset.id);
      renderList();
    }
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closePanel();
  });
}

/** Abre el panel desde el inicio. */
export function openObjectsPanel() {
  pauseForSettings();
  closeEditor();
  renderList();
  dialog.showModal();
}

function closePanel() {
  cancelRequest('');
  closeEditor();
  if (dialog.open) dialog.close();
}

/* ---------- Foto e IA ---------- */

/** @param {File} file */
async function handlePhoto(file) {
  cancelRequest('');
  setStatus(PHOTO_MESSAGES.preparing);
  /** @type {{ upload: string, thumb: string }} */
  let photo;
  try {
    photo = await preparePhoto(file);
  } catch {
    setStatus(PHOTO_MESSAGES.badPhoto);
    return;
  }
  openEditor(photo.thumb);

  const controller = new AbortController();
  request = controller;
  startTicker();
  const result = await describePhoto(photo.upload, controller.signal);
  if (request !== controller) return; // se canceló o llegó otra foto
  request = null;
  stopTicker();
  setWaiting(false);

  if (!result.ok) {
    setStatus(PHOTO_MESSAGES[result.code]);
    field('word').focus();
    return;
  }
  // Lo que el adulto ya escribió manda sobre la IA.
  if (!field('word').value) field('word').value = result.word;
  if (!field('short').value) field('short').value = result.shortPhrase;
  if (!field('long').value) field('long').value = result.longPhrase;
  renderSyllables();
  setStatus(PHOTO_MESSAGES.ready);
  field('word').focus();
}

/** @param {string} message */
function cancelRequest(message) {
  if (!request) return;
  request.abort();
  request = null;
  stopTicker();
  setWaiting(false);
  if (message) setStatus(message);
}

function startTicker() {
  const started = Date.now();
  setWaiting(true);
  const tick = () => {
    const seconds = Math.round((Date.now() - started) / 1000);
    setStatus(`${PHOTO_MESSAGES.waiting} ${seconds} s`);
  };
  tick();
  ticker = setInterval(tick, 1000);
}

function stopTicker() {
  clearInterval(ticker);
  ticker = undefined;
}

/** @param {boolean} waiting */
function setWaiting(waiting) {
  getElement('objects-cancel', HTMLButtonElement).hidden = !waiting;
}

/** @param {string} message */
function setStatus(message) {
  getElement('objects-status', HTMLElement).textContent = message;
}

/* ---------- Edición ---------- */

/** @param {string} photo */
function openEditor(photo) {
  draftPhoto = photo;
  for (const name of ['word', 'short', 'long']) field(name).value = '';
  const preview = getElement('objects-preview', HTMLImageElement);
  preview.hidden = !photo;
  if (photo) preview.src = photo;
  getElement('objects-editor', HTMLFieldSetElement).hidden = false;
  renderSyllables();
  if (!photo) {
    setStatus('');
    field('word').focus();
  }
}

/** "Escribir yo la palabra": con una foto en curso, la conserva y deja de esperar a la IA. */
function writeManually() {
  if (getElement('objects-editor', HTMLFieldSetElement).hidden) {
    openEditor('');
    return;
  }
  cancelRequest('');
  setStatus('');
  field('word').focus();
}

function closeEditor() {
  cancelRequest('');
  draftPhoto = '';
  getElement('objects-editor', HTMLFieldSetElement).hidden = true;
  setStatus('');
}

/** Muestra cómo se va a partir la palabra: "pe · lo · ta". */
function renderSyllables() {
  const word = field('word').value;
  getElement('objects-syllables', HTMLElement).textContent = word.trim() ? syllabify(word).join(' · ') : '';
}

function saveDraft() {
  const short = field('short').value;
  const long = field('long').value;
  const object = normalizeObject({
    id: newObjectId(field('word').value, state.savedObjects),
    word: field('word').value,
    shortPhrase: short,
    longPhrase: long,
    photo: draftPhoto || undefined,
  });
  if (!object) return fail(PHOTO_MESSAGES.badWord, 'word');
  if (short.trim() && !normalizePhrase(short, 2, 2)) return fail(PHOTO_MESSAGES.badShort, 'short');
  if (long.trim() && !normalizePhrase(long, 3, 4)) return fail(PHOTO_MESSAGES.badLong, 'long');

  const before = state.savedObjects.length;
  addObject(object);
  closeEditor();
  renderList();
  setStatus(state.savedObjects.length <= before ? PHOTO_MESSAGES.full : PHOTO_MESSAGES.saved);
}

/**
 * @param {string} message
 * @param {string} name
 */
function fail(message, name) {
  setStatus(message);
  field(name).focus();
}

/** La lista de objetos guardados, con su botón para quitar. */
function renderList() {
  const list = getElement('objects-list', HTMLElement);
  list.innerHTML = state.savedObjects.length
    ? state.savedObjects
        .map((object) => {
          const word = escapeHTML(object.word);
          const picture = object.photo
            ? `<img class="objects__thumb" src="${escapeHTML(object.photo)}" alt="" width="56" height="56">`
            : `<span class="objects__thumb objects__thumb--empty">${icon('image', { size: 28 })}</span>`;
          return `<li class="objects__item">${picture}<span class="objects__word">${word}</span>
            <button class="settings__button" type="button" data-objects="remove" data-id="${escapeHTML(object.id)}"
              aria-label="Quitar ${word}">${icon('trash-2', { size: 20 })}</button></li>`;
        })
        .join('')
    : '<li class="objects__empty">Todavía no hay objetos de casa. El juego usa sus dibujos.</li>';
}
