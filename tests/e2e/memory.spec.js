/**
 * Fugas: se juegan 20 sesiones seguidas y se compara lo que queda en memoria
 * (nodos del DOM, escuchas de eventos y heap de JavaScript) con lo que había
 * después de la primera. Solo Chromium: usa el protocolo de DevTools (CDP).
 */

import { test, expect, openGame, runUntil, playRound } from './fixtures.js';

const SESSIONS = 20;

test.skip(({ browserName }) => browserName !== 'chromium', 'usa CDP');
test.setTimeout(240_000);

/** @param {import('@playwright/test').CDPSession} cdp */
async function measure(cdp) {
  await cdp.send('HeapProfiler.collectGarbage');
  const counters = await cdp.send('Memory.getDOMCounters');
  const heap = await cdp.send('Runtime.getHeapUsage');
  return { nodes: counters.nodes, listeners: counters.jsEventListeners, heapMB: heap.usedSize / 1024 / 1024 };
}

/** @param {import('@playwright/test').Page} page */
async function playSession(page) {
  await page.locator('[data-mode="syllables"]').click();
  for (let round = 1; round <= 3; round++) await playRound(page);
  await runUntil(page, (state) => state.endButtonsVisible, 60_000, 500);
  await page.getByRole('button', { name: 'Inicio' }).click();
}

test(`después de ${SESSIONS} sesiones no se acumulan nodos, escuchas ni memoria`, async ({ page }) => {
  await openGame(page, { mode: 'syllables', level: 'easy' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Memory.getDOMCounters');

  await playSession(page);
  const first = await measure(cdp);
  for (let i = 1; i < SESSIONS; i++) await playSession(page);
  const last = await measure(cdp);

  console.log(`memoria tras 1 sesión: ${JSON.stringify(first)}\nmemoria tras ${SESSIONS}: ${JSON.stringify(last)}`);
  expect(last.listeners).toBeLessThanOrEqual(first.listeners + 5);
  expect(last.nodes).toBeLessThanOrEqual(first.nodes + 50);
  expect(last.heapMB).toBeLessThan(first.heapMB * 1.5 + 2);
});
