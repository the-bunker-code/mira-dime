/**
 * Arranque y primer recorrido: con la CSP estricta de _headers el juego debe
 * dibujarse completo, sin errores en la consola.
 */

import { test, expect } from './fixtures.js';

test('el inicio se dibuja con la CSP estricta y sin terceros', async ({ page }) => {
  /** @type {string[]} */
  const external = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://localhost')) external.push(request.url());
  });

  await page.goto('/');
  await expect(page.locator('#mode-grid .mode-card')).toHaveCount(4);
  await expect(page.locator('#level-picker .level')).toHaveCount(3);
  await expect(page.locator('#boot-warning')).toHaveCount(0);
  await expect(page.locator('[data-action="open-objects"]')).toBeHidden(); // fotos e IA, ocultas por ahora
  // El color de la tarjeta (Letras, coral) llega por data-vars (CSSOM), no por style="".
  const background = await page
    .locator('.mode-card')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).toBe('rgb(194, 65, 12)');
  expect(external).toEqual([]);
});

test('el primer modo es Letras y su ronda se dibuja y acepta piezas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mode-card').first()).toHaveAttribute('data-mode', 'letters');
  await expect(page.locator('.mode-card').nth(1)).toHaveAttribute('data-mode', 'syllables');
  await page.locator('[data-mode="letters"]').click();
  await expect(page.locator('#tray .piece')).toHaveCount(2);
  const slots = await page.locator('#table .slot').count();
  expect(slots).toBeGreaterThanOrEqual(3);
  expect(slots).toBeLessThanOrEqual(4);
  await expect(page.locator('#table .slot__guide')).toHaveCount(slots);
  await expect(page.locator('#tray .piece').first()).toHaveAttribute('aria-disabled', 'false', { timeout: 15_000 });
});
