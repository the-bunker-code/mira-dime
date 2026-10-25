/**
 * Que no se olvide un archivo: cada módulo de js/ debe estar en el
 * `modulepreload` de index.html y en la lista FILES de sw.js (modo offline).
 * Y cada archivo que lista el service worker debe existir, igual que los dibujos.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const modules = readdirSync('js').filter((name) => name.endsWith('.js'));
const html = readFileSync('index.html', 'utf8');
const worker = readFileSync('sw.js', 'utf8');

test('cada módulo de js/ tiene su <link rel="modulepreload">', () => {
  for (const name of modules) assert.ok(html.includes(`href="js/${name}"`), `falta modulepreload de js/${name}`);
});

test('cada módulo de js/ está en FILES de sw.js', () => {
  for (const name of modules) assert.ok(worker.includes(`'js/${name}'`), `falta js/${name} en sw.js`);
});

test('todo lo que lista sw.js existe', () => {
  const listed = [...worker.matchAll(/^ {2}'([^']+)',$/gm)].map((match) => match[1]);
  assert.ok(listed.length > 10);
  for (const path of listed) assert.ok(existsSync(path === './' ? 'index.html' : path), `no existe ${path}`);
});

test('el manifiesto apunta a íconos que existen', () => {
  const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  for (const icon of manifest.icons) assert.ok(existsSync(icon.src), `no existe ${icon.src}`);
});

test('cada dibujo de los objetos de fábrica existe y está en FILES de sw.js', async () => {
  const { BUILTIN_OBJECTS } = await import('../js/config.js');
  for (const object of BUILTIN_OBJECTS) {
    assert.ok(object.drawing, `${object.id} no tiene dibujo`);
    assert.ok(existsSync(object.drawing), `no existe ${object.drawing}`);
    assert.ok(worker.includes(`'${object.drawing}'`), `falta ${object.drawing} en sw.js`);
  }
});
