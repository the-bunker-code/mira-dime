/**
 * Pruebas de objects.js: lo guardado (y lo que propone la IA) no es confiable.
 */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { MAX_SAVED_OBJECTS } from '../js/config.js';
import {
  OBJECTS_KEY,
  loadObjects,
  newObjectId,
  normalizeObject,
  normalizeObjects,
  normalizePhrase,
  resetObjectsMemory,
  saveObjects,
} from '../js/objects.js';
import { createMemoryStorage, useStorage } from './helpers.js';

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const VALID = {
  id: 'casa-pelota',
  word: 'Pelota',
  shortPhrase: 'La pelota',
  longPhrase: '¡La pelota es roja!',
  photo: PHOTO,
};

/** @type {() => void} */
let restore = () => {};
afterEach(() => {
  restore();
  resetObjectsMemory();
});

test('un objeto válido se limpia: minúsculas y sin signos', () => {
  assert.deepEqual(normalizeObject(VALID), {
    id: 'casa-pelota',
    word: 'pelota',
    shortPhrase: 'la pelota',
    longPhrase: 'la pelota es roja',
    photo: PHOTO,
  });
});

test('sin palabra válida o sin id, el objeto se descarta', () => {
  assert.equal(normalizeObject(null), null);
  assert.equal(normalizeObject('pelota'), null);
  assert.equal(normalizeObject({ ...VALID, word: 'pelota roja' }), null);
  assert.equal(normalizeObject({ ...VALID, word: '<img src=x onerror=alert(1)>' }), null);
  assert.equal(normalizeObject({ ...VALID, word: 'a'.repeat(21) }), null);
  assert.equal(normalizeObject({ ...VALID, id: 'Casa Pelota' }), null);
  assert.equal(normalizeObject({ ...VALID, id: 3 }), null);
});

test('una foto que no es JPEG en base64 se quita, el objeto sigue', () => {
  for (const photo of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', `${PHOTO}"onload="x`, 42]) {
    const object = normalizeObject({ ...VALID, photo });
    assert.ok(object);
    assert.equal(object.photo, undefined, String(photo));
  }
  assert.equal(normalizeObject({ ...VALID, photo: `data:image/jpeg;base64,${'A'.repeat(200_001)}` })?.photo, undefined);
});

test('frases con largo equivocado quedan vacías (ese modo no usa el objeto)', () => {
  assert.equal(normalizePhrase('la pelota roja', 2, 2), '');
  assert.equal(normalizePhrase('pelota', 3, 4), '');
  assert.equal(normalizePhrase('la pelota es muy roja', 3, 4), '');
  assert.equal(normalizePhrase('la pel0ta es roja', 3, 4), '');
  assert.equal(normalizePhrase(undefined, 2, 2), '');
  assert.equal(normalizePhrase('El gato', 2, 2), 'el gato');
});

test('la lista: sin inválidos, sin ids repetidos y con tope', () => {
  assert.deepEqual(normalizeObjects('nada'), []);
  const list = normalizeObjects([VALID, { ...VALID, word: 'otra' }, null, { word: 'sin id' }]);
  assert.equal(list.length, 1);
  const many = Array.from({ length: MAX_SAVED_OBJECTS + 5 }, (_, i) => ({ ...VALID, id: `casa-x-${i}` }));
  assert.equal(normalizeObjects(many).length, MAX_SAVED_OBJECTS);
});

test('ids nuevos: sin acentos ni repetidos', () => {
  assert.equal(newObjectId('Árbol', []), 'casa-arbol');
  const existing = [{ id: 'casa-arbol', word: 'arbol', shortPhrase: '', longPhrase: '' }];
  assert.equal(newObjectId('árbol', existing), 'casa-arbol-2');
  assert.equal(newObjectId('árbol', [...existing, { ...existing[0], id: 'casa-arbol-2' }]), 'casa-arbol-3');
  assert.equal(newObjectId('!!!', []), 'casa-objeto');
});

test('guardar y cargar devuelve lo mismo', () => {
  const storage = createMemoryStorage();
  restore = useStorage(storage);
  const saved = saveObjects([VALID]);
  assert.equal(saved.length, 1);
  assert.match(OBJECTS_KEY, /:v1$/);
  resetObjectsMemory();
  assert.deepEqual(loadObjects(), saved);
});

test('guardar una lista vacía también se guarda (al quitar el último)', () => {
  const storage = createMemoryStorage();
  restore = useStorage(storage);
  saveObjects([VALID]);
  saveObjects([]);
  assert.equal(storage.getItem(OBJECTS_KEY), '[]');
});

test('almacenamiento lleno: se quitan los más viejos hasta que entre', () => {
  const one = JSON.stringify(normalizeObjects([VALID])).length;
  restore = useStorage(createMemoryStorage({ quota: one + 10 }));
  const list = [VALID, { ...VALID, id: 'casa-b' }, { ...VALID, id: 'casa-c' }];
  const saved = saveObjects(list);
  assert.deepEqual(
    saved.map((object) => object.id),
    ['casa-pelota'],
  );
});

test('localStorage bloqueado: la lista sigue completa en memoria', () => {
  restore = useStorage(createMemoryStorage({ failing: true }));
  assert.deepEqual(loadObjects(), []);
  const saved = saveObjects([VALID, { ...VALID, id: 'casa-b' }]);
  assert.equal(saved.length, 2);
  assert.equal(loadObjects().length, 2);
});

test('JSON corrupto no rompe el arranque', () => {
  const storage = createMemoryStorage();
  restore = useStorage(storage);
  storage.setItem(OBJECTS_KEY, '{roto');
  assert.deepEqual(loadObjects(), []);
});
