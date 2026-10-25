/**
 * "Instalar en el celular" (Ajustes para adultos). Chrome manda
 * beforeinstallprompt cuando la app se puede instalar; aquí lo simulamos.
 */

import { test, expect } from './fixtures.js';

test('sin aviso del navegador la sección no aparece', async ({ page }) => {
  await page.goto('/');
  await page.locator('#screen-home [data-action="open-settings"]').click();
  await expect(page.locator('#install')).toBeHidden();
});

test('con el aviso de Chrome aparece "Instalar" y abre el diálogo del navegador una vez', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const event = /** @type {Event & Record<string, unknown>} */ (
      new Event('beforeinstallprompt', { cancelable: true })
    );
    event.prompt = async () => {
      document.body.dataset.installPrompts = String(Number(document.body.dataset.installPrompts ?? 0) + 1);
    };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  await page.locator('#screen-home [data-action="open-settings"]').click();
  const button = page.getByRole('button', { name: 'Instalar' });
  await expect(button).toBeVisible();
  await expect(page.locator('#install-ios')).toBeHidden();
  await button.click();
  await expect(page.locator('#install')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-install-prompts', '1');
});

test('en iPhone muestra los pasos de Safari', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4173/');
  await page.locator('#screen-home [data-action="open-settings"]').click();
  await expect(page.locator('#install-ios')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Instalar' })).toBeHidden();
  await context.close();
});
