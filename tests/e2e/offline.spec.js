/**
 * Sin internet: después de una visita, el service worker abre el juego igual.
 * También verifica que la página no pida nada a otros sitios.
 */

import { test, expect } from './fixtures.js';

test.use({ serviceWorkers: 'allow' });

test('con el service worker activo, el juego abre y se juega sin internet', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // la segunda carga ya pasa por el service worker
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#screen-home')).toBeVisible();
  await page.locator('[data-mode="syllables"]').click();
  await expect(page.locator('#screen-game')).toBeVisible();
  await expect(page.locator('#tray .piece').first()).toBeVisible(); // 1 o 2: "coco" tiene una sola pieza (CO)
  const drawing = page.locator('#prompt-card .picture__drawing');
  await expect(drawing).toBeVisible();
  expect(await drawing.evaluate((img) => /** @type {HTMLImageElement} */ (img).naturalWidth)).toBeGreaterThan(0);
  await context.setOffline(false);
});
