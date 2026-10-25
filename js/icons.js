/**
 * icons.js — Íconos de Lucide (https://lucide.dev, licencia ISC).
 * Copiamos solo los trazos que usa el juego para que funcione sin internet
 * y sin CDN. Los trazos son los oficiales de lucide-static, sin cambios.
 * Para agregar uno: copia el contenido interno de icons/<nombre>.svg del
 * repositorio lucide-icons/lucide y pégalo en ICON_PATHS.
 */

/** @type {Record<string, string>} */
const ICON_PATHS = {
  /* Interfaz */
  'settings':
    '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/> <circle cx="12" cy="12" r="3"/>',
  'volume-2':
    '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/> <path d="M16 9a5 5 0 0 1 0 6"/> <path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
  'info': '<circle cx="12" cy="12" r="10"/> <path d="M12 16v-4"/> <path d="M12 8h.01"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'star':
    '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  'house':
    '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/> <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/> <path d="M3 3v5h5"/>',
  'signal-low': '<path d="M2 20h.01"/> <path d="M7 20v-4"/>',
  'signal-medium': '<path d="M2 20h.01"/> <path d="M7 20v-4"/> <path d="M12 20v-8"/>',
  'signal-high': '<path d="M2 20h.01"/> <path d="M7 20v-4"/> <path d="M12 20v-8"/> <path d="M17 20V8"/>',
  'arrow-right': '<path d="M5 12h14"/> <path d="m12 5 7 7-7 7"/>',
  'camera':
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/> <circle cx="12" cy="13" r="3"/>',
  'image':
    '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/> <circle cx="9" cy="9" r="2"/> <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  'trash-2':
    '<path d="M3 6h18"/> <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/> <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/> <line x1="10" x2="10" y1="11" y2="17"/> <line x1="14" x2="14" y1="11" y2="17"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'message-circle-heart':
    '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/> <path d="M15.8 9.2a2.5 2.5 0 0 0-3.5 0l-.3.4-.35-.3a2.42 2.42 0 1 0-3.2 3.6l3.6 3.5 3.6-3.5c1.2-1.2 1.1-2.7.2-3.7"/>',
  'pencil':
    '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/> <path d="m15 5 4 4"/>',
  'book': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
};

/**
 * Devuelve el SVG de un ícono como texto.
 * Sin `label` es decorativo (aria-hidden); con `label` tiene significado propio.
 * `fill` sirve para las estrellas rellenas del final ('currentColor').
 * @param {string} name
 * @param {{ size?: number, strokeWidth?: number, label?: string, className?: string, fill?: string }} [options]
 */
export function icon(name, { size = 24, strokeWidth = 2.5, label = '', className = '', fill = 'none' } = {}) {
  const paths = ICON_PATHS[name];
  if (!paths) throw new Error(`Ícono desconocido: ${name}`);
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="icon ${className}" ${a11y} width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"
    stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

/**
 * Reemplaza cada <span data-icon="nombre"> del HTML fijo por su SVG.
 * Acepta data-size y data-stroke opcionales.
 * @param {ParentNode} root
 */
export function hydrateIcons(root = document) {
  /** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll('[data-icon]')).forEach((el) => {
    const size = Number(el.dataset.size) || 24;
    const strokeWidth = Number(el.dataset.stroke) || 2.5;
    el.outerHTML = icon(el.dataset.icon ?? '', { size, strokeWidth });
  });
}
