/**
 * Objetos de casa: foto → IA (simulada con page.route) → revisar → guardar →
 * la sesión siguiente empieza con ese objeto. También los caminos sin IA:
 * saturada, sin internet y escribir la palabra a mano.
 * Nada sale a OpenRouter: /api/describe se responde aquí.
 */

import { test, expect, openGame, gameState, runUntil, openObjectsPanel } from './fixtures.js';

/** Una foto JPEG real de 16×16 px (roja), para que createImageBitmap la pueda abrir. */
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCGAMLG/9k=',
  'base64',
);

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} status
 * @param {Record<string, unknown>} body
 */
async function mockDescribe(page, status, body) {
  /** @type {any[]} */
  const requests = [];
  await page.route('**/api/describe', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return requests;
}

/** @param {import('@playwright/test').Page} page */
async function takePhoto(page) {
  await page.locator('#objects-file').setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: JPEG });
}

test('foto → la IA propone → el adulto guarda → la sesión empieza con la foto', async ({ page }) => {
  const requests = await mockDescribe(page, 200, {
    word: 'pelota',
    shortPhrase: 'la pelota',
    longPhrase: 'la pelota es roja',
  });
  await openGame(page, { level: 'medium' });
  await openObjectsPanel(page);
  await expect(page.locator('#objects')).toBeVisible();

  await takePhoto(page);
  await expect(page.locator('#object-word')).toHaveValue('pelota');
  await expect(page.locator('#object-short')).toHaveValue('la pelota');
  await expect(page.locator('#object-long')).toHaveValue('la pelota es roja');
  await expect(page.locator('#objects-syllables')).toHaveText('pe · lo · ta');
  await expect(page.locator('#objects-preview')).toBeVisible();
  // Lo que viaja es un JPEG nuevo hecho en canvas (sin los metadatos del original).
  expect(requests[0].image).toMatch(/^data:image\/jpeg;base64,/);

  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('#objects-list .objects__item')).toHaveCount(1);
  await expect(page.locator('#objects-status')).toContainText('Guardado');
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.locator('#objects-count')).toHaveText('(1)');

  await page.locator('[data-mode="syllables"]').click();
  await runUntil(page, (state) => state.phase === 'answering');
  expect((await gameState(page)).objectId).toBe('casa-pelota');
  expect((await gameState(page)).units).toEqual(['pe', 'lo', 'ta']);
  await expect(page.locator('#prompt-card .picture__photo')).toHaveAttribute('alt', 'pelota');

  // Sigue guardado después de recargar.
  await page.reload();
  await expect(page.locator('#objects-count')).toHaveText('(1)');
});

test.describe('IA saturada', () => {
  test.use({ allowedConsole: [/status of 503/] });

  test('avisa al adulto y deja escribir la palabra', async ({ page }) => {
    await mockDescribe(page, 503, { error: 'busy' });
    await openGame(page);
    await openObjectsPanel(page);
    await takePhoto(page);
    await expect(page.locator('#objects-status')).toContainText('muy ocupada');
    await expect(page.locator('#object-word')).toBeFocused();
    await page.locator('#object-word').fill('taza');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.locator('#objects-list')).toContainText('taza');
  });
});

test('sin internet: no se llama a la IA y se escribe a mano', async ({ page, context }) => {
  const requests = await mockDescribe(page, 200, { word: 'nada' });
  await openGame(page);
  await openObjectsPanel(page);
  await context.setOffline(true);
  await takePhoto(page);
  await expect(page.locator('#objects-status')).toContainText('Sin internet');
  expect(requests).toHaveLength(0);
  await context.setOffline(false);
});

test('escribir a mano sin foto, con validación de palabra y frases', async ({ page }) => {
  await openGame(page);
  await openObjectsPanel(page);
  await page.getByRole('button', { name: 'Escribir yo la palabra' }).click();

  await page.locator('#object-word').fill('dos palabras');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('#objects-status')).toContainText('solo letras');

  await page.locator('#object-word').fill('Cuchara');
  await page.locator('#object-short').fill('la cuchara grande');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('#objects-status')).toContainText('2 palabras');

  await page.locator('#object-short').fill('la cuchara');
  await expect(page.locator('#objects-syllables')).toHaveText('cu · cha · ra');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('#objects-list')).toContainText('cuchara');

  await page.getByRole('button', { name: 'Quitar cuchara' }).click();
  await expect(page.locator('#objects-list .objects__item')).toHaveCount(0);
});

test('lo escrito a mano manda sobre lo que propone la IA', async ({ page }) => {
  /** @type {(value?: unknown) => void} */
  let release = () => {};
  const gate = new Promise((resolve) => (release = resolve));
  await page.route('**/api/describe', async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"word":"balon","shortPhrase":"el balon"}',
    });
  });
  await openGame(page);
  await openObjectsPanel(page);
  await takePhoto(page);
  await expect(page.locator('#objects-cancel')).toBeVisible();
  await page.locator('#object-word').fill('pelota');
  release();
  await expect(page.locator('#objects-status')).toContainText('Revisa');
  await expect(page.locator('#object-word')).toHaveValue('pelota');
  await expect(page.locator('#object-short')).toHaveValue('el balon');
});

test('cancelar la espera de la IA', async ({ page }) => {
  await page.route('**/api/describe', () => {
    /* nunca responde */
  });
  await openGame(page);
  await openObjectsPanel(page);
  await takePhoto(page);
  await expect(page.locator('#objects-status')).toContainText('Mirando la foto');
  await page.locator('#objects-cancel').click();
  await expect(page.locator('#objects-status')).toContainText('Cancelado');
  await expect(page.locator('#objects-cancel')).toBeHidden();
});

test('datos guardados maliciosos no se dibujan como HTML', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'mira-y-dime:objects:v1',
      JSON.stringify([
        { id: 'casa-x', word: '<img src=x onerror=alert(1)>', shortPhrase: '', longPhrase: '' },
        { id: 'casa-ok', word: 'vaso', shortPhrase: 'el vaso', longPhrase: '', photo: 'javascript:alert(1)' },
      ]),
    );
  });
  await openGame(page);
  await expect(page.locator('#objects-count')).toHaveText('(1)');
  await openObjectsPanel(page);
  await expect(page.locator('#objects-list img')).toHaveCount(0);
  await expect(page.locator('#objects-list')).toContainText('vaso');
});
