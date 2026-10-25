/**
 * audio.js — La voz (Web Speech API) y los tonos (Web Audio API).
 * Los tonos se generan con un oscilador: no hay archivos de sonido que
 * cargar. Si el navegador no tiene voz en español, o no tiene voz, el juego
 * funciona igual: `say` se resuelve y sigue.
 */

const VOICE_LANGS = ['es-MX', 'es-US', 'es-419', 'es-PE', 'es-CO', 'es-AR', 'es-ES', 'es'];
const MAX_SPEECH_MS = 5000;

/** @type {AudioContext | null} */
let audioContext = null;
/** @type {SpeechSynthesisVoice | null} */
let chosenVoice = null;
let voiceEnabled = true;
let soundEnabled = true;

/**
 * Activa o apaga voz y sonidos según los ajustes.
 * @param {{ voice: boolean, sound: boolean }} settings
 */
export function configureAudio({ voice, sound }) {
  voiceEnabled = voice;
  soundEnabled = sound;
  if (!voice) stopSpeaking();
}

/**
 * Los navegadores bloquean el audio hasta el primer toque del usuario.
 * Se llama al elegir un modo.
 */
export function unlockAudio() {
  try {
    if (!audioContext) audioContext = new AudioContext();
    // resume() devuelve una promesa; si el navegador la rechaza, el juego sigue sin tonos.
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch {
    audioContext = null;
  }
  pickVoice();
}

/**
 * Elige la voz en español. Orden de preferencia:
 *   1. Voces del propio dispositivo (`localService`), por el orden de VOICE_LANGS.
 *   2. Cualquier voz local en español.
 *   3. Solo si no hay ninguna local: las mismas búsquedas entre las de red.
 * Las voces de red (por ejemplo las "Google" de Chrome) mandan el texto de cada
 * frase a un servidor externo; por eso una local siempre gana, aunque sea de un
 * español menos preferido. Es una función pura para poder probarla.
 * @param {readonly SpeechSynthesisVoice[]} voices
 * @returns {SpeechSynthesisVoice | null}
 */
export function chooseVoice(voices) {
  /** @param {SpeechSynthesisVoice} voice */
  const normalizedLang = (voice) => voice.lang.replace('_', '-').toLowerCase();
  const find = (/** @type {SpeechSynthesisVoice[]} */ pool) => {
    for (const lang of VOICE_LANGS) {
      const exact = pool.find((voice) => normalizedLang(voice) === lang.toLowerCase());
      if (exact) return exact;
    }
    return pool.find((voice) => normalizedLang(voice).startsWith('es')) ?? null;
  };
  return find(voices.filter((voice) => voice.localService)) ?? find([...voices]);
}

function pickVoice() {
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
  chosenVoice = chooseVoice(synth.getVoices());
}

// Las voces llegan tarde en Chrome: volvemos a elegir cuando aparecen.
globalThis.speechSynthesis?.addEventListener?.('voiceschanged', pickVoice);

export function stopSpeaking() {
  try {
    globalThis.speechSynthesis?.cancel();
  } catch {
    /* sin voz */
  }
}

/**
 * Dice una frase. Interrumpe la anterior para que no se forme una cola.
 * Se resuelve al terminar de hablar, o a los 5 s como máximo.
 * @param {string} text
 * @returns {Promise<void>}
 */
export function say(text) {
  const synth = globalThis.speechSynthesis;
  if (!voiceEnabled || !synth || !text) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer;
    const finish = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve();
      }
    };
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = chosenVoice?.lang ?? 'es-MX';
      if (chosenVoice) utterance.voice = chosenVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      utterance.onend = finish;
      utterance.onerror = finish;
      synth.speak(utterance);
      // Tope de seguridad por si el navegador nunca avisa que terminó de hablar.
      if (!done) timer = setTimeout(finish, MAX_SPEECH_MS);
    } catch {
      finish();
    }
  });
}

/** Un tono seno corto. */
/**
 * @param {number} frequency  Hz
 * @param {number} durationSec
 * @param {number} [volume]
 * @param {number} [delaySec]
 */
function tone(frequency, durationSec, volume = 0.12, delaySec = 0) {
  if (!soundEnabled || !audioContext) return;
  const start = audioContext.currentTime + delaySec;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  // Subida y bajada suaves: evitan el "clic" de cortar la onda de golpe.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + durationSec + 0.02);
}

/**
 * Tono que sube con el número: 1 grave, 2 un poco más agudo...
 * @param {number} n
 */
export function playCountTone(n) {
  tone(330 + n * 20, 0.08);
}

/** Acierto: tres notas ascendentes (do, mi, sol). */
export function playSuccessTone() {
  [523, 659, 784].forEach((f, i) => tone(f, 0.12, 0.12, i * 0.11));
}

/** Error: un tono grave y suave. Nunca un sonido feo. */
export function playSoftErrorTone() {
  tone(240, 0.14, 0.08);
}

/** Neutro: tapar, destapar, mover un vaso. */
export function playNeutralTone() {
  tone(440, 0.07, 0.06);
}
