/**
 * Panel de ajustes para adultos: guardar, cancelar, Escape y foco.
 */

import { test, expect, STORAGE_KEY, openGame, gameState } from './fixtures.js';

test('guardar cambia las rondas, persiste y empieza la sesión', async ({ page }) => {
  await openGame(page, { rounds: 5, mode: 'letters' });
  await page.locator('#screen-home [data-action="open-settings"]').click();
  await expect(page.locator('#settings')).toBeVisible();

  await page.locator('label[for="setting-voice-false"]').click();
  await page.locator('label[for="setting-rounds-3"]').click();
  await page.getByRole('button', { name: 'Guardar y empezar' }).click();

  await expect(page.locator('#screen-game')).toBeVisible();
  expect((await gameState(page)).totalRounds).toBe(3);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(saved).toMatchObject({ rounds: 3, voice: false, mode: 'letters' });
});

test('cancelar no guarda nada', async ({ page }) => {
  await openGame(page, { rounds: 5 });
  await page.locator('#screen-home [data-action="open-settings"]').click();
  await page.locator('label[for="setting-rounds-8"]').click();
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.locator('#settings')).not.toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(saved.rounds).not.toBe(8);
});

test('Escape cierra el panel y el foco vuelve al engranaje', async ({ page }) => {
  await openGame(page);
  const gear = page.locator('#screen-home [data-action="open-settings"]');
  await gear.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).not.toBeVisible();
  await expect(gear).toBeFocused();
});

test('los datos guardados corruptos no rompen el arranque', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{"mode":"__proto__","rounds":"cien"'), STORAGE_KEY);
  await page.goto('/');
  await expect(page.locator('#mode-grid .mode-card')).toHaveCount(4);
});
