/**
 * SEO, Open Graph e instalación: las URLs absolutas apuntan al mismo sitio y
 * cada imagen que se anuncia existe con el tamaño que dice.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');

/** @param {string} pattern */
function meta(pattern) {
  const match = html.match(new RegExp(`<(?:meta|link) ${pattern} (?:content|href)="([^"]+)"`));
  assert.ok(match, `falta ${pattern}`);
  return match[1];
}

/** Ancho y alto de un PNG (cabecera IHDR). @param {string} path */
function pngSize(path) {
  const data = readFileSync(path);
  return `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`;
}

const site = meta('rel="canonical"');

test('canonical, og:url, robots.txt y sitemap.xml usan el mismo sitio', () => {
  assert.match(site, /^https:\/\/[^/]+\/$/);
  assert.equal(meta('property="og:url"'), site);
  assert.ok(readFileSync('robots.txt', 'utf8').includes(`Sitemap: ${site}sitemap.xml`));
  assert.ok(readFileSync('sitemap.xml', 'utf8').includes(`<loc>${site}</loc>`));
});

test('og:image es absoluta, existe y mide lo que dice', () => {
  const image = meta('property="og:image"');
  assert.ok(image.startsWith(site), 'og:image debe ser una URL absoluta del sitio');
  const path = image.slice(site.length);
  assert.ok(existsSync(path), `no existe ${path}`);
  assert.equal(pngSize(path), `${meta('property="og:image:width"')}x${meta('property="og:image:height"')}`);
  assert.equal(meta('name="twitter:card"'), 'summary_large_image');
});

test('el manifiesto tiene id, ícono maskable y capturas que existen', () => {
  const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(manifest.id, './');
  assert.ok(manifest.icons.some((/** @type {{ purpose?: string }} */ icon) => icon.purpose === 'maskable'));
  const forms = new Set();
  for (const shot of manifest.screenshots) {
    assert.ok(existsSync(shot.src), `no existe ${shot.src}`);
    assert.equal(pngSize(shot.src), shot.sizes);
    forms.add(shot.form_factor);
  }
  assert.deepEqual([...forms].sort(), ['narrow', 'wide']);
});
