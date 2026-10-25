/**
 * dom.js — Ayudas para dibujar con innerHTML sin romper la CSP ni el teclado:
 *   escapeHTML      texto que escribió una persona o la IA, seguro dentro del HTML
 *   applyStyleVars  pone variables CSS sin escribir style="" en el HTML
 *   updateZone      redibuja una zona solo si cambió y devuelve el foco al mismo botón
 */

/** @type {Record<string, string>} */
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapa texto para ponerlo dentro de HTML o de un atributo entre comillas.
 * @param {string} text
 */
export function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * data-vars="--base:#e5392f;--shine:#ff8f85" → element.style.setProperty.
 * La CSP (_headers) bloquea el atributo style="" pero permite CSSOM desde nuestro
 * JS. Solo se aceptan custom properties (--*); los valores salen de config.js.
 * @param {ParentNode} root
 */
export function applyStyleVars(root) {
  for (const element of root.querySelectorAll('[data-vars]')) {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) continue;
    for (const declaration of (element.dataset.vars ?? '').split(';')) {
      const [name, value] = declaration.split(':').map((part) => part.trim());
      if (name?.startsWith('--') && value) element.style.setProperty(name, value);
    }
  }
}

/** Atributos que identifican a un control entre un dibujo y el siguiente. */
const IDENTITY_ATTRIBUTES = [
  'name',
  'value',
  'data-action',
  'data-mode',
  'data-level',
  'data-value',
  'data-settings',
  'data-objects',
  'data-id',
];

/**
 * Selector del control, p. ej. [data-action="choose-answer"][data-value="red"].
 * @param {Element} element
 * @returns {string}
 */
function identitySelector(element) {
  return IDENTITY_ATTRIBUTES.filter((attribute) => element.hasAttribute(attribute))
    .map((attribute) => `[${attribute}="${CSS.escape(element.getAttribute(attribute) ?? '')}"]`)
    .join('');
}

/** Último HTML puesto en cada zona, para no tocar el DOM si no cambió. */
const lastHTML = new WeakMap();

/**
 * Sin cambios no toca el DOM (así no se reinician las animaciones). Con cambios
 * pone el HTML y devuelve el foco al mismo control; si ya no existe, al primero
 * con la misma acción. Sin esto el foco cae en <body> en cada toque y quien usa
 * teclado o lector de pantalla pierde el lugar.
 * @param {HTMLElement} zone
 * @param {string} html
 */
export function updateZone(zone, html) {
  if (lastHTML.get(zone) === html) return;
  lastHTML.set(zone, html);

  const active = document.activeElement;
  const hadFocus = active instanceof HTMLElement && active !== zone && zone.contains(active);
  const selector = hadFocus ? identitySelector(active) : '';
  const action = hadFocus ? active.getAttribute('data-action') : null;

  zone.innerHTML = html;
  applyStyleVars(zone);
  if (!hadFocus) return;

  const target =
    (selector && zone.querySelector(selector)) ||
    (action && zone.querySelector(`[data-action="${CSS.escape(action)}"]`)) ||
    zone.querySelector('button, [tabindex="0"], input');
  if (target instanceof HTMLElement) target.focus();
}
