/**
 * install.js — "Instalar en el celular", dentro de Ajustes para adultos.
 *
 * Android y Chrome de escritorio avisan con `beforeinstallprompt`: guardamos el
 * aviso y mostramos el botón "Instalar". Safari en iPhone/iPad no tiene ese
 * evento: ahí solo mostramos cómo hacerlo a mano (Compartir → Agregar a inicio).
 * Si el juego ya corre instalado, la sección no aparece.
 * Los textos están en index.html; aquí solo se elige cuál se ve.
 */

/** @typedef {'hidden' | 'prompt' | 'ios'} InstallView */

/**
 * Qué mostrar según lo que sabe el navegador.
 * @param {{ standalone: boolean, canPrompt: boolean, ios: boolean }} env
 * @returns {InstallView}
 */
export function installView({ standalone, canPrompt, ios }) {
  if (standalone) return 'hidden';
  if (canPrompt) return 'prompt';
  return ios ? 'ios' : 'hidden';
}

/**
 * iPhone, iPod o iPad (el iPad moderno dice "Macintosh" pero tiene pantalla táctil).
 * @param {string} userAgent
 * @param {number} maxTouchPoints
 */
export function isIOS(userAgent, maxTouchPoints) {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/**
 * El evento de Chrome no está en los tipos de TypeScript.
 * @typedef {Event & { prompt: () => Promise<void>, userChoice: Promise<{ outcome: string }> }} InstallPromptEvent
 */

/** @type {InstallPromptEvent | null} */
let deferred = null;

function isStandalone() {
  const iosStandalone = /** @type {{ standalone?: boolean }} */ (navigator).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

function update() {
  const section = document.getElementById('install');
  const button = document.getElementById('install-button');
  const iosNote = document.getElementById('install-ios');
  if (!section || !button || !iosNote) return;
  const view = installView({
    standalone: isStandalone(),
    canPrompt: deferred !== null,
    ios: isIOS(navigator.userAgent, navigator.maxTouchPoints),
  });
  section.hidden = view === 'hidden';
  button.hidden = view !== 'prompt';
  iosNote.hidden = view !== 'ios';
}

async function install() {
  if (!deferred) return;
  const event = deferred;
  deferred = null; // el aviso de Chrome sirve una sola vez
  await event.prompt();
  await event.userChoice;
  update();
}

export function setupInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // sin la barra automática: el adulto decide desde Ajustes
    deferred = /** @type {InstallPromptEvent} */ (event);
    update();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    update();
  });
  document.getElementById('install-button')?.addEventListener('click', () => {
    install().catch(() => update());
  });
  update();
}
