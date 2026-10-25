/**
 * Recorridos reales: cada modo y nivel de principio a fin, un error con la
 * ayuda completa, toques en ráfaga y una sesión hasta la pantalla final.
 * El reloj es simulado (fixtures.openGame), así que cada uno tarda milisegundos.
 */

import { test, expect, openGame, gameState, runUntil, pieceButton, playRound } from './fixtures.js';

const MODES = /** @type {const} */ (['syllables', 'letters', 'shortPhrase', 'longPhrase']);
const LEVELS = /** @type {const} */ (['easy', 'medium', 'hard']);

for (const mode of MODES) {
  for (const level of LEVELS) {
    test(`${mode}/${level}: una sesión completa llega a la pantalla final`, async ({ page }) => {
      await openGame(page, { level });
      await page.locator(`[data-mode="${mode}"]`).click();

      for (let round = 1; round <= 3; round++) {
        await runUntil(page, (state) => state.phase === 'answering' && state.roundNumber === round);
        // La maqueta no cambia: una casilla por pieza, de 2 a 4 piezas para elegir.
        const { units, bank } = await gameState(page);
        await expect(page.locator('#table .slot')).toHaveCount(units.length);
        expect(bank.length).toBeGreaterThanOrEqual(Math.min(2, units.length));
        expect(bank.length).toBeLessThanOrEqual(4);
        await playRound(page);
      }

      await runUntil(page, (state) => state.screen === 'end');
      await expect(page.locator('#screen-end')).toBeVisible();
      await expect(page.locator('#end-stars .icon')).toHaveCount(3);
      await expect(page.locator('#end-said')).toHaveText('Lo dijo en 3 de 3 rondas.');
      // Los botones del final aparecen con retraso, para que el cierre se sienta como cierre.
      await expect(page.locator('#end-buttons')).not.toHaveClass(/is-visible/);
      await runUntil(page, (state) => state.endButtonsVisible);
      await expect(page.locator('#end-buttons')).toHaveClass(/is-visible/);
      await expect(page.getByRole('button', { name: 'Otra vez' })).toBeVisible();
    });
  }
}

test('dos errores seguidos: ayuda, no dice "no" y la pieza que sigue queda marcada', async ({ page }) => {
  await openGame(page, { level: 'medium' });
  await page.locator('[data-mode="syllables"]').click();
  await runUntil(page, (state) => state.phase === 'answering');

  const { units, bank } = await gameState(page);
  const wrong = /** @type {string} */ (bank.find((piece) => piece !== units[0]));
  await pieceButton(page, wrong).click();
  await expect(pieceButton(page, wrong)).toHaveClass(/is-nudged/);
  expect((await gameState(page)).phase).toBe('answering');
  await pieceButton(page, wrong).click();

  await runUntil(page, (state) => state.phase === 'helping');
  await expect(page.locator('#tray')).toHaveClass(/tray--waiting/);
  await runUntil(page, (state) => state.phase === 'answering');
  await expect(pieceButton(page, units[0])).toHaveClass(/is-pulsing/);

  const spoken = /** @type {string[]} */ (await page.evaluate(() => /** @type {any} */ (window).__spoken));
  expect(spoken.some((phrase) => /^no\b/i.test(phrase))).toBe(false);
  expect(spoken).toContain('¡Casi! Otra vez.');
  expect(spoken).toContain('Esta sigue.');

  await pieceButton(page, units[0]).click();
  await expect(page.locator('#table .slot.is-filled')).toHaveCount(1);
});

test('toques en ráfaga sobre la última pieza avanzan una sola ronda', async ({ page }) => {
  await openGame(page);
  await page.locator('[data-mode="shortPhrase"]').click();
  await runUntil(page, (state) => state.phase === 'answering');
  const { units } = await gameState(page);
  await pieceButton(page, units[0]).click();

  // Seis toques seguidos sobre el mismo botón, en el mismo instante (aunque se redibuje).
  await pieceButton(page, units[1]).evaluate((button) => {
    for (let i = 0; i < 6; i++) button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await runUntil(page, (state) => state.phase === 'saying');
  await page.getByRole('button', { name: 'Lo dijo' }).evaluate((button) => {
    for (let i = 0; i < 4; i++) button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await runUntil(page, (state) => state.roundNumber === 2);
  await page.clock.runFor(500);
  const state = await gameState(page);
  expect(state.roundNumber).toBe(2);
  expect(state.saidCount).toBe(1);
});

test('"Seguir" avanza sin contar "Lo dijo"', async ({ page }) => {
  await openGame(page);
  await page.locator('[data-mode="syllables"]').click();
  await runUntil(page, (state) => state.phase === 'answering');
  for (const unit of (await gameState(page)).units) await pieceButton(page, unit).click();
  await runUntil(page, (state) => state.phase === 'saying');
  await page.getByRole('button', { name: 'Seguir' }).click();
  await runUntil(page, (state) => state.roundNumber === 2);
  expect((await gameState(page)).saidCount).toBe(0);
});

test('volver al inicio a mitad de la ronda no deja nada colgado', async ({ page }) => {
  await openGame(page);
  await page.locator('[data-mode="letters"]').click();
  await page.clock.runFor(1500);
  await page.locator('#screen-game [data-action="open-settings"]').click();
  await page.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.locator('#screen-home')).toBeVisible();
  await page.clock.runFor(30_000);
  await expect(page.locator('#screen-home')).toBeVisible();
  expect((await gameState(page)).screen).toBe('home');
});
