/**
 * spanish.js — Ayudas de idioma: separar en sílabas, en letras y en palabras.
 * La voz es un modelo que la niña imita (ecolalia), así que las piezas deben
 * salir correctas: "pe-rro" y no "per-ro", "gui-ta-rra" y no "gu-i-tar-ra".
 * Concentrar esas reglas aquí evita errores repartidos.
 * LÓGICA PURA: sin DOM, sin red. Probada en tests/spanish.test.js.
 */

/** Pone la primera letra en mayúscula. @param {string} text */
export function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

const STRONG_VOWELS = new Set(['a', 'e', 'o', 'á', 'é', 'ó', 'í', 'ú']);
const WEAK_VOWELS = new Set(['i', 'u', 'ü']);
const VOWELS = new Set([...STRONG_VOWELS, ...WEAK_VOWELS]);

/** Pares de consonantes que nunca se separan: "li-bro", "pla-to". */
const INSEPARABLE = new Set(['pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr', 'pl', 'bl', 'cl', 'gl', 'fl', 'kr', 'kl']);

/**
 * Letras válidas de una palabra en español (sin espacios ni signos).
 * @param {string} text
 */
export function isSpanishWord(text) {
  return /^[a-záéíóúüñ]+$/.test(text);
}

/**
 * Pasa a minúsculas y quita espacios y signos de los bordes: "¡Pelota!" → "pelota".
 * @param {string} text
 */
export function normalizeWord(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/^[^a-záéíóúüñ]+|[^a-záéíóúüñ]+$/g, '');
}

/**
 * Parte la palabra en sonidos: "ch", "ll", "rr", "qu" y "gu" (antes de e/i)
 * cuentan como una sola consonante. La "y" es vocal al final ("rey") o antes
 * de consonante; si no, es consonante ("yo-yo").
 * @param {string} word
 * @returns {Array<{ text: string, vowel: boolean, strong: boolean }>}
 */
function tokenize(word) {
  const tokens = [];
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const next = word[i + 1] ?? '';
    const afterNext = word[i + 2] ?? '';
    const pair = char + next;
    if (pair === 'ch' || pair === 'll' || pair === 'rr' || pair === 'qu') {
      tokens.push({ text: pair, vowel: false, strong: false });
      i++;
    } else if (pair === 'gu' && 'eiéí'.includes(afterNext)) {
      tokens.push({ text: pair, vowel: false, strong: false });
      i++;
    } else if (char === 'y') {
      const isVowel = i > 0 && (!next || !VOWELS.has(next));
      tokens.push({ text: char, vowel: isVowel, strong: false });
    } else {
      tokens.push({ text: char, vowel: VOWELS.has(char), strong: STRONG_VOWELS.has(char) });
    }
  }
  return tokens;
}

/**
 * Separa una palabra en sílabas con las reglas del español:
 * V-CV ("ca-sa"), VC-CV ("man-za-na"), V-CCV con grupos inseparables
 * ("li-bro"), VC-CCV ("hom-bre"), VCC-CV ("ins-tan-te"); diptongos juntos
 * ("puer-ta") e hiatos separados ("a-e-ro", "dí-a").
 * Una palabra sin vocales vuelve entera.
 * @param {string} rawWord
 * @returns {string[]}
 */
export function syllabify(rawWord) {
  const word = normalizeWord(rawWord);
  const tokens = tokenize(word);

  // 1. Núcleos: vocales seguidas forman uno solo, salvo dos fuertes (hiato).
  /** @type {Array<{ start: number, end: number }>} */
  const nuclei = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!tokens[i].vowel) continue;
    const last = nuclei[nuclei.length - 1];
    const previous = tokens[i - 1];
    if (last && last.end === i - 1 && previous.vowel && !(previous.strong && tokens[i].strong)) {
      last.end = i;
    } else {
      nuclei.push({ start: i, end: i });
    }
  }
  if (nuclei.length === 0) return word ? [word] : [];

  // 2. Dónde empieza cada sílaba: depende de cuántas consonantes hay entre núcleos.
  const starts = [0];
  for (let n = 1; n < nuclei.length; n++) {
    const from = nuclei[n - 1].end + 1;
    const to = nuclei[n].start; // primera vocal del núcleo siguiente
    const consonants = tokens.slice(from, to).map((token) => token.text);
    const count = consonants.length;
    const lastTwo = consonants.slice(-2).join('');
    let split;
    if (count <= 1) split = from;
    else if (count === 2) split = INSEPARABLE.has(lastTwo) ? from : from + 1;
    else split = INSEPARABLE.has(lastTwo) ? to - 2 : to - 1;
    starts.push(split);
  }

  return starts.map((start, i) => {
    const end = starts[i + 1] ?? tokens.length;
    return tokens
      .slice(start, end)
      .map((token) => token.text)
      .join('');
  });
}

/**
 * Letras de una palabra, una por pieza: "pelota" → ["p","e","l","o","t","a"].
 * La "ll", la "ch" y la "rr" son dos letras (así se escriben).
 * @param {string} rawWord
 */
export function splitLetters(rawWord) {
  return [...normalizeWord(rawWord)];
}

/**
 * Palabras de una frase, sin signos: "¡El gato duerme!" → ["el","gato","duerme"].
 * @param {string} phrase
 */
export function splitWords(phrase) {
  return String(phrase).toLowerCase().split(/\s+/).map(normalizeWord).filter(Boolean);
}
