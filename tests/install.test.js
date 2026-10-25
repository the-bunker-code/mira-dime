import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installView, isIOS } from '../js/install.js';

test('ya instalado: no se muestra nada', () => {
  assert.equal(installView({ standalone: true, canPrompt: true, ios: false }), 'hidden');
  assert.equal(installView({ standalone: true, canPrompt: false, ios: true }), 'hidden');
});

test('Chrome con aviso guardado: botón Instalar', () => {
  assert.equal(installView({ standalone: false, canPrompt: true, ios: false }), 'prompt');
});

test('iPhone sin aviso: pasos de Safari; otro navegador sin aviso: nada', () => {
  assert.equal(installView({ standalone: false, canPrompt: false, ios: true }), 'ios');
  assert.equal(installView({ standalone: false, canPrompt: false, ios: false }), 'hidden');
});

test('detecta iPhone e iPad (también el iPad que dice ser Mac)', () => {
  assert.equal(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5), true);
  assert.equal(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), true);
  assert.equal(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0), false);
  assert.equal(isIOS('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5), false);
});
