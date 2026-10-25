/**
 * Pruebas de la elección de voz: la privacidad de los niños depende de que una
 * voz del propio dispositivo gane a una voz de red (que manda el texto a un servidor).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { chooseVoice } from '../js/audio.js';

/**
 * @param {string} name
 * @param {string} lang
 * @param {boolean} localService
 * @returns {SpeechSynthesisVoice}
 */
function voice(name, lang, localService) {
  return /** @type {SpeechSynthesisVoice} */ ({ name, lang, localService, default: false, voiceURI: name });
}

test('sin voces devuelve null', () => {
  assert.equal(chooseVoice([]), null);
  assert.equal(chooseVoice([voice('Samantha', 'en-US', true)]), null);
});

test('una voz local gana a una de red aunque la de red tenga mejor idioma', () => {
  const google = voice('Google español de Estados Unidos', 'es-US', false);
  const microsoft = voice('Microsoft Helena', 'es-ES', true);
  assert.equal(chooseVoice([google, microsoft]), microsoft);
});

test('entre voces locales respeta el orden de idiomas (es-MX antes que es-ES)', () => {
  const spain = voice('Spain', 'es-ES', true);
  const mexico = voice('Mexico', 'es_MX', true); // Android escribe es_MX con guion bajo
  assert.equal(chooseVoice([spain, mexico]), mexico);
});

test('una voz local en un español no listado (es-CL) gana a una de red conocida', () => {
  const chile = voice('Chile', 'es-CL', true);
  const google = voice('Google español', 'es-MX', false);
  assert.equal(chooseVoice([google, chile]), chile);
});

test('si no hay ninguna local, usa una de red en español', () => {
  const google = voice('Google español', 'es-ES', false);
  assert.equal(chooseVoice([voice('Samantha', 'en-US', true), google]), google);
});
