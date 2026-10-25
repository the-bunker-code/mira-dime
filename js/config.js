/**
 * config.js — Datos fijos del juego: modos, temas, niveles, objetos de
 * fábrica, textos y tiempos.
 * Todo lo que un adulto o un desarrollador podría querer ajustar vive aquí,
 * separado de la lógica. Así cambiar un tiempo o un texto no obliga a leer
 * el resto del código.
 */

/**
 * @typedef {'syllables'|'letters'|'shortPhrase'|'longPhrase'} ModeId
 * @typedef {'easy'|'medium'|'hard'} LevelId
 */

/**
 * `strong` y `strongDark` son para superficies con texto blanco encima (tarjetas
 * y etiqueta del modo): dan >= 4,5:1. `main` y `dark` son los colores de
 * identidad para fondos, bordes y adornos.
 * @typedef {{ main: string, dark: string, strong: string, strongDark: string, light: string, skyTop: string, skyBottom: string, hills: string }} Theme
 */

/**
 * Temas de color. Cada modo tiene el suyo y nunca cambia. Los tres primeros son
 * los de Memo Colores; `green` es nuevo para el cuarto modo.
 * @type {Record<string, Theme>}
 */
export const THEMES = {
  home: {
    main: '#ffa23a',
    dark: '#af630e',
    strong: '#c2410c',
    strongDark: '#9a3412',
    light: '#fff0d6',
    skyTop: '#ffe7b8',
    skyBottom: '#fff8ea',
    hills: '#b9e48f',
  },
  blue: {
    main: '#4f8ef7',
    dark: '#2f6fd8',
    strong: '#2f6fd8',
    strongDark: '#1f55b0',
    light: '#dbe9ff',
    skyTop: '#c4e2ff',
    skyBottom: '#eef7ff',
    hills: '#a8dc86',
  },
  coral: {
    main: '#ff7a4d',
    dark: '#ca4f27',
    strong: '#c2410c',
    strongDark: '#9a3412',
    light: '#ffe3d6',
    skyTop: '#ffdcc4',
    skyBottom: '#fff5ec',
    hills: '#ffc58f',
  },
  pink: {
    main: '#ff5d8f',
    dark: '#d6396a',
    strong: '#be185d',
    strongDark: '#9d174d',
    light: '#ffdbe7',
    skyTop: '#ffd6e5',
    skyBottom: '#fff1f6',
    hills: '#ffb6cd',
  },
  // Nuevo. strong #15803d con blanco: 5,0:1 (WCAG AA).
  green: {
    main: '#3aa53a',
    dark: '#237a23',
    strong: '#15803d',
    strongDark: '#166534',
    light: '#dcf5d6',
    skyTop: '#d2f0c8',
    skyBottom: '#f2fbef',
    hills: '#9fd88a',
  },
};

/**
 * Modos del juego. El orden define el orden de las tarjetas en el inicio:
 * Sílabas va primero porque es el modo con el que se empieza.
 * `tips` son los consejos del desplegable "Para el adulto" de ese modo.
 * @type {Array<{ id: ModeId, name: string, subtitle: string, icon: string, theme: string, tips: string[] }>}
 */
export const MODES = [
  {
    id: 'letters',
    name: 'Letras',
    subtitle: 'Arma la palabra',
    icon: 'pencil',
    theme: 'coral',
    tips: [
      'Cada casilla muestra la letra tenue: ella busca la misma forma. No necesita saber leer.',
      'Di el sonido de la letra junto con la voz.',
      'En Avanzado no hay letra guía: úsalo cuando el nivel anterior le resulte fácil.',
    ],
  },
  {
    id: 'syllables',
    name: 'Sílabas',
    subtitle: 'pe · lo · ta',
    icon: 'message-circle-heart',
    theme: 'blue',
    tips: [
      'Ella toca la sílaba que sigue y la pieza vuela a su lugar. La voz dice cada sílaba.',
      'Aplaudan juntos cada sílaba: "pe-lo-ta" son tres palmadas.',
      'Al final la voz dice "Ahora dilo tú". Si lo dice (o lo intenta), toca "Lo dijo".',
    ],
  },
  {
    id: 'shortPhrase',
    name: 'Frase corta',
    subtitle: 'Dos palabras',
    icon: 'book',
    theme: 'pink',
    tips: [
      'La voz dice la frase completa primero: es el modelo que ella puede repetir.',
      'Cada pieza es una palabra. Señala la foto mientras la voz la nombra.',
    ],
  },
  {
    id: 'longPhrase',
    name: 'Frase larga',
    subtitle: 'Tres o cuatro palabras',
    icon: 'star',
    theme: 'green',
    tips: [
      'Frases de tres o cuatro palabras, como "el gato duerme".',
      'Si se cansa, vuelve a Frase corta: lo importante es que termine contenta.',
    ],
  },
];

/** @param {string} id */
export function modeById(id) {
  return MODES.find((mode) => mode.id === id) ?? MODES[0];
}

/** @type {Array<{ id: LevelId, name: string, hint: string, icon: string }>} */
export const LEVELS = [
  { id: 'easy', name: 'Principiante', hint: 'Para empezar', icon: 'signal-low' },
  { id: 'medium', name: 'Intermedio', hint: 'Un poco más', icon: 'signal-medium' },
  { id: 'hard', name: 'Avanzado', hint: 'Reto', icon: 'signal-high' },
];

/** @param {string} id */
export function levelById(id) {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[0];
}

/**
 * Reglas por modo y nivel. `rules.js` y las pruebas leen solo de aquí.
 * - min / max: cuántas piezas (sílabas, letras o palabras) tiene el objeto.
 * - bank: cuántas piezas se ven a la vez para elegir (2 a 4).
 * - guide: la casilla muestra la pieza tenue (emparejar formas, sin leer).
 * @typedef {{ min: number, max: number, bank: number, guide: boolean }} LevelRule
 * @type {Record<ModeId, Record<LevelId, LevelRule>>}
 */
export const LEVEL_RULES = {
  syllables: {
    easy: { min: 2, max: 2, bank: 2, guide: true },
    medium: { min: 3, max: 3, bank: 3, guide: true },
    hard: { min: 4, max: 5, bank: 4, guide: false },
  },
  letters: {
    easy: { min: 3, max: 4, bank: 2, guide: true },
    medium: { min: 3, max: 6, bank: 3, guide: true },
    hard: { min: 3, max: 6, bank: 4, guide: false },
  },
  shortPhrase: {
    easy: { min: 2, max: 2, bank: 2, guide: true },
    medium: { min: 2, max: 2, bank: 2, guide: true },
    hard: { min: 2, max: 2, bank: 2, guide: false },
  },
  longPhrase: {
    easy: { min: 3, max: 3, bank: 3, guide: true },
    medium: { min: 3, max: 4, bank: 3, guide: true },
    hard: { min: 4, max: 4, bank: 4, guide: false },
  },
};

/** Frases para el niño: como mucho 4 palabras (la voz es un modelo que imita). */
export const MAX_PHRASE_WORDS = 4;

/** Fallos seguidos antes de que la voz muestre la pieza que sigue. */
export const MISSES_BEFORE_HELP = 2;

export const ROUND_OPTIONS = [3, 5, 8];

/**
 * Un objeto que se arma: una palabra, sus frases y su dibujo o foto.
 * `drawing` (objetos de fábrica) es un SVG de img/objects/; `photo` (objetos de
 * casa) es una miniatura JPEG en data URL.
 * @typedef {{ id: string, word: string, shortPhrase: string, longPhrase: string, drawing?: string, photo?: string }} GameObject
 */

/**
 * Objetos de fábrica: el juego funciona sin fotos, sin IA y sin internet.
 * 184 objetos con palabras de 1 a 5 sílabas, para que cada nivel tenga variedad.
 * Los dibujos son de Fluent Emoji (img/objects/, licencia MIT).
 * @type {GameObject[]}
 */
export const BUILTIN_OBJECTS = [
  {
    id: 'casa',
    word: 'casa',
    shortPhrase: 'la casa',
    longPhrase: 'la casa es grande',
    drawing: 'img/objects/casa.svg',
  },
  { id: 'gato', word: 'gato', shortPhrase: 'el gato', longPhrase: 'el gato duerme', drawing: 'img/objects/gato.svg' },
  {
    id: 'perro',
    word: 'perro',
    shortPhrase: 'el perro',
    longPhrase: 'el perro corre',
    drawing: 'img/objects/perro.svg',
  },
  { id: 'luna', word: 'luna', shortPhrase: 'la luna', longPhrase: 'la luna brilla', drawing: 'img/objects/luna.svg' },
  { id: 'libro', word: 'libro', shortPhrase: 'el libro', longPhrase: 'leo un libro', drawing: 'img/objects/libro.svg' },
  {
    id: 'llave',
    word: 'llave',
    shortPhrase: 'la llave',
    longPhrase: 'la llave abre',
    drawing: 'img/objects/llave.svg',
  },
  { id: 'sol', word: 'sol', shortPhrase: 'el sol', longPhrase: 'el sol calienta', drawing: 'img/objects/sol.svg' },
  { id: 'pez', word: 'pez', shortPhrase: 'el pez', longPhrase: 'el pez nada', drawing: 'img/objects/pez.svg' },
  {
    id: 'flor',
    word: 'flor',
    shortPhrase: 'la flor',
    longPhrase: 'la flor es bonita',
    drawing: 'img/objects/flor.svg',
  },
  {
    id: 'tren',
    word: 'tren',
    shortPhrase: 'el tren',
    longPhrase: 'el tren va rápido',
    drawing: 'img/objects/tren.svg',
  },
  {
    id: 'manzana',
    word: 'manzana',
    shortPhrase: 'la manzana',
    longPhrase: 'como una manzana',
    drawing: 'img/objects/manzana.svg',
  },
  {
    id: 'estrella',
    word: 'estrella',
    shortPhrase: 'la estrella',
    longPhrase: 'la estrella brilla',
    drawing: 'img/objects/estrella.svg',
  },
  {
    id: 'conejo',
    word: 'conejo',
    shortPhrase: 'el conejo',
    longPhrase: 'el conejo salta',
    drawing: 'img/objects/conejo.svg',
  },
  {
    id: 'tortuga',
    word: 'tortuga',
    shortPhrase: 'la tortuga',
    longPhrase: 'la tortuga camina',
    drawing: 'img/objects/tortuga.svg',
  },
  {
    id: 'cohete',
    word: 'cohete',
    shortPhrase: 'el cohete',
    longPhrase: 'el cohete vuela alto',
    drawing: 'img/objects/cohete.svg',
  },
  {
    id: 'paraguas',
    word: 'paraguas',
    shortPhrase: 'el paraguas',
    longPhrase: 'abro el paraguas',
    drawing: 'img/objects/paraguas.svg',
  },
  {
    id: 'pajaro',
    word: 'pájaro',
    shortPhrase: 'el pájaro',
    longPhrase: 'el pájaro canta',
    drawing: 'img/objects/pajaro.svg',
  },
  {
    id: 'avion',
    word: 'avión',
    shortPhrase: 'el avión',
    longPhrase: 'el avión vuela',
    drawing: 'img/objects/avion.svg',
  },
  {
    id: 'arbol',
    word: 'árbol',
    shortPhrase: 'el árbol',
    longPhrase: 'el árbol es alto',
    drawing: 'img/objects/arbol.svg',
  },
  {
    id: 'zanahoria',
    word: 'zanahoria',
    shortPhrase: 'la zanahoria',
    longPhrase: 'el conejo come zanahoria',
    drawing: 'img/objects/zanahoria.svg',
  },
  {
    id: 'bicicleta',
    word: 'bicicleta',
    shortPhrase: 'la bicicleta',
    longPhrase: 'mi bicicleta es roja',
    drawing: 'img/objects/bicicleta.svg',
  },
  {
    id: 'television',
    word: 'televisión',
    shortPhrase: 'la televisión',
    longPhrase: 'miro la televisión',
    drawing: 'img/objects/television.svg',
  },
  {
    id: 'telefono',
    word: 'teléfono',
    shortPhrase: 'el teléfono',
    longPhrase: 'el teléfono suena',
    drawing: 'img/objects/telefono.svg',
  },
  {
    id: 'caramelo',
    word: 'caramelo',
    shortPhrase: 'el caramelo',
    longPhrase: 'el caramelo es dulce',
    drawing: 'img/objects/caramelo.svg',
  },
  { id: 'leon', word: 'león', shortPhrase: 'el león', longPhrase: 'el león ruge', drawing: 'img/objects/leon.svg' },
  {
    id: 'tigre',
    word: 'tigre',
    shortPhrase: 'el tigre',
    longPhrase: 'el tigre corre',
    drawing: 'img/objects/tigre.svg',
  },
  { id: 'oso', word: 'oso', shortPhrase: 'el oso', longPhrase: 'el oso duerme', drawing: 'img/objects/oso.svg' },
  {
    id: 'mono',
    word: 'mono',
    shortPhrase: 'el mono',
    longPhrase: 'el mono come plátano',
    drawing: 'img/objects/mono.svg',
  },
  { id: 'vaca', word: 'vaca', shortPhrase: 'la vaca', longPhrase: 'la vaca da leche', drawing: 'img/objects/vaca.svg' },
  {
    id: 'cerdo',
    word: 'cerdo',
    shortPhrase: 'el cerdo',
    longPhrase: 'el cerdo come',
    drawing: 'img/objects/cerdo.svg',
  },
  {
    id: 'caballo',
    word: 'caballo',
    shortPhrase: 'el caballo',
    longPhrase: 'el caballo corre rápido',
    drawing: 'img/objects/caballo.svg',
  },
  {
    id: 'oveja',
    word: 'oveja',
    shortPhrase: 'la oveja',
    longPhrase: 'la oveja come pasto',
    drawing: 'img/objects/oveja.svg',
  },
  {
    id: 'gallina',
    word: 'gallina',
    shortPhrase: 'la gallina',
    longPhrase: 'la gallina pone huevos',
    drawing: 'img/objects/gallina.svg',
  },
  {
    id: 'pollito',
    word: 'pollito',
    shortPhrase: 'el pollito',
    longPhrase: 'el pollito es amarillo',
    drawing: 'img/objects/pollito.svg',
  },
  { id: 'pato', word: 'pato', shortPhrase: 'el pato', longPhrase: 'el pato nada', drawing: 'img/objects/pato.svg' },
  { id: 'rana', word: 'rana', shortPhrase: 'la rana', longPhrase: 'la rana salta', drawing: 'img/objects/rana.svg' },
  {
    id: 'raton',
    word: 'ratón',
    shortPhrase: 'el ratón',
    longPhrase: 'el ratón come queso',
    drawing: 'img/objects/raton.svg',
  },
  {
    id: 'elefante',
    word: 'elefante',
    shortPhrase: 'el elefante',
    longPhrase: 'el elefante es grande',
    drawing: 'img/objects/elefante.svg',
  },
  {
    id: 'jirafa',
    word: 'jirafa',
    shortPhrase: 'la jirafa',
    longPhrase: 'la jirafa es alta',
    drawing: 'img/objects/jirafa.svg',
  },
  {
    id: 'cebra',
    word: 'cebra',
    shortPhrase: 'la cebra',
    longPhrase: 'la cebra tiene rayas',
    drawing: 'img/objects/cebra.svg',
  },
  {
    id: 'ballena',
    word: 'ballena',
    shortPhrase: 'la ballena',
    longPhrase: 'la ballena nada',
    drawing: 'img/objects/ballena.svg',
  },
  {
    id: 'delfin',
    word: 'delfín',
    shortPhrase: 'el delfín',
    longPhrase: 'el delfín salta',
    drawing: 'img/objects/delfin.svg',
  },
  {
    id: 'pulpo',
    word: 'pulpo',
    shortPhrase: 'el pulpo',
    longPhrase: 'el pulpo nada',
    drawing: 'img/objects/pulpo.svg',
  },
  {
    id: 'caracol',
    word: 'caracol',
    shortPhrase: 'el caracol',
    longPhrase: 'el caracol camina despacio',
    drawing: 'img/objects/caracol.svg',
  },
  {
    id: 'mariposa',
    word: 'mariposa',
    shortPhrase: 'la mariposa',
    longPhrase: 'la mariposa vuela',
    drawing: 'img/objects/mariposa.svg',
  },
  {
    id: 'abeja',
    word: 'abeja',
    shortPhrase: 'la abeja',
    longPhrase: 'la abeja vuela',
    drawing: 'img/objects/abeja.svg',
  },
  {
    id: 'arana',
    word: 'araña',
    shortPhrase: 'la araña',
    longPhrase: 'la araña teje',
    drawing: 'img/objects/arana.svg',
  },
  {
    id: 'hormiga',
    word: 'hormiga',
    shortPhrase: 'la hormiga',
    longPhrase: 'la hormiga camina',
    drawing: 'img/objects/hormiga.svg',
  },
  {
    id: 'serpiente',
    word: 'serpiente',
    shortPhrase: 'la serpiente',
    longPhrase: 'la serpiente se arrastra',
    drawing: 'img/objects/serpiente.svg',
  },
  {
    id: 'cocodrilo',
    word: 'cocodrilo',
    shortPhrase: 'el cocodrilo',
    longPhrase: 'el cocodrilo nada',
    drawing: 'img/objects/cocodrilo.svg',
  },
  {
    id: 'pinguino',
    word: 'pingüino',
    shortPhrase: 'el pingüino',
    longPhrase: 'el pingüino camina',
    drawing: 'img/objects/pinguino.svg',
  },
  { id: 'buho', word: 'búho', shortPhrase: 'el búho', longPhrase: 'el búho mira', drawing: 'img/objects/buho.svg' },
  { id: 'loro', word: 'loro', shortPhrase: 'el loro', longPhrase: 'el loro habla', drawing: 'img/objects/loro.svg' },
  {
    id: 'zorro',
    word: 'zorro',
    shortPhrase: 'el zorro',
    longPhrase: 'el zorro corre',
    drawing: 'img/objects/zorro.svg',
  },
  { id: 'lobo', word: 'lobo', shortPhrase: 'el lobo', longPhrase: 'el lobo aúlla', drawing: 'img/objects/lobo.svg' },
  {
    id: 'panda',
    word: 'panda',
    shortPhrase: 'el panda',
    longPhrase: 'el panda come',
    drawing: 'img/objects/panda.svg',
  },
  {
    id: 'koala',
    word: 'koala',
    shortPhrase: 'el koala',
    longPhrase: 'el koala duerme',
    drawing: 'img/objects/koala.svg',
  },
  {
    id: 'camello',
    word: 'camello',
    shortPhrase: 'el camello',
    longPhrase: 'el camello camina',
    drawing: 'img/objects/camello.svg',
  },
  {
    id: 'canguro',
    word: 'canguro',
    shortPhrase: 'el canguro',
    longPhrase: 'el canguro salta',
    drawing: 'img/objects/canguro.svg',
  },
  {
    id: 'dinosaurio',
    word: 'dinosaurio',
    shortPhrase: 'el dinosaurio',
    longPhrase: 'el dinosaurio es enorme',
    drawing: 'img/objects/dinosaurio.svg',
  },
  {
    id: 'tiburon',
    word: 'tiburón',
    shortPhrase: 'el tiburón',
    longPhrase: 'el tiburón nada',
    drawing: 'img/objects/tiburon.svg',
  },
  {
    id: 'cangrejo',
    word: 'cangrejo',
    shortPhrase: 'el cangrejo',
    longPhrase: 'el cangrejo camina',
    drawing: 'img/objects/cangrejo.svg',
  },
  {
    id: 'gusano',
    word: 'gusano',
    shortPhrase: 'el gusano',
    longPhrase: 'el gusano come',
    drawing: 'img/objects/gusano.svg',
  },
  {
    id: 'ardilla',
    word: 'ardilla',
    shortPhrase: 'la ardilla',
    longPhrase: 'la ardilla salta',
    drawing: 'img/objects/ardilla.svg',
  },
  {
    id: 'erizo',
    word: 'erizo',
    shortPhrase: 'el erizo',
    longPhrase: 'el erizo duerme',
    drawing: 'img/objects/erizo.svg',
  },
  {
    id: 'murcielago',
    word: 'murciélago',
    shortPhrase: 'el murciélago',
    longPhrase: 'el murciélago vuela',
    drawing: 'img/objects/murcielago.svg',
  },
  {
    id: 'gallo',
    word: 'gallo',
    shortPhrase: 'el gallo',
    longPhrase: 'el gallo canta',
    drawing: 'img/objects/gallo.svg',
  },
  {
    id: 'unicornio',
    word: 'unicornio',
    shortPhrase: 'el unicornio',
    longPhrase: 'el unicornio es blanco',
    drawing: 'img/objects/unicornio.svg',
  },
  {
    id: 'dragon',
    word: 'dragón',
    shortPhrase: 'el dragón',
    longPhrase: 'el dragón vuela',
    drawing: 'img/objects/dragon.svg',
  },
  { id: 'foca', word: 'foca', shortPhrase: 'la foca', longPhrase: 'la foca nada', drawing: 'img/objects/foca.svg' },
  {
    id: 'flamenco',
    word: 'flamenco',
    shortPhrase: 'el flamenco',
    longPhrase: 'el flamenco es rosado',
    drawing: 'img/objects/flamenco.svg',
  },
  {
    id: 'cisne',
    word: 'cisne',
    shortPhrase: 'el cisne',
    longPhrase: 'el cisne nada',
    drawing: 'img/objects/cisne.svg',
  },
  {
    id: 'mariquita',
    word: 'mariquita',
    shortPhrase: 'la mariquita',
    longPhrase: 'la mariquita vuela',
    drawing: 'img/objects/mariquita.svg',
  },
  {
    id: 'hipopotamo',
    word: 'hipopótamo',
    shortPhrase: 'el hipopótamo',
    longPhrase: 'el hipopótamo es grande',
    drawing: 'img/objects/hipopotamo.svg',
  },
  {
    id: 'rinoceronte',
    word: 'rinoceronte',
    shortPhrase: 'el rinoceronte',
    longPhrase: 'el rinoceronte corre',
    drawing: 'img/objects/rinoceronte.svg',
  },
  {
    id: 'platano',
    word: 'plátano',
    shortPhrase: 'el plátano',
    longPhrase: 'el plátano es amarillo',
    drawing: 'img/objects/platano.svg',
  },
  { id: 'uva', word: 'uva', shortPhrase: 'la uva', longPhrase: 'como una uva', drawing: 'img/objects/uva.svg' },
  {
    id: 'fresa',
    word: 'fresa',
    shortPhrase: 'la fresa',
    longPhrase: 'la fresa es roja',
    drawing: 'img/objects/fresa.svg',
  },
  {
    id: 'naranja',
    word: 'naranja',
    shortPhrase: 'la naranja',
    longPhrase: 'la naranja es dulce',
    drawing: 'img/objects/naranja.svg',
  },
  { id: 'pera', word: 'pera', shortPhrase: 'la pera', longPhrase: 'como una pera', drawing: 'img/objects/pera.svg' },
  {
    id: 'sandia',
    word: 'sandía',
    shortPhrase: 'la sandía',
    longPhrase: 'la sandía es grande',
    drawing: 'img/objects/sandia.svg',
  },
  { id: 'pina', word: 'piña', shortPhrase: 'la piña', longPhrase: 'la piña es dulce', drawing: 'img/objects/pina.svg' },
  {
    id: 'cereza',
    word: 'cereza',
    shortPhrase: 'la cereza',
    longPhrase: 'la cereza es roja',
    drawing: 'img/objects/cereza.svg',
  },
  {
    id: 'limon',
    word: 'limón',
    shortPhrase: 'el limón',
    longPhrase: 'el limón es ácido',
    drawing: 'img/objects/limon.svg',
  },
  { id: 'kiwi', word: 'kiwi', shortPhrase: 'el kiwi', longPhrase: 'el kiwi es verde', drawing: 'img/objects/kiwi.svg' },
  {
    id: 'durazno',
    word: 'durazno',
    shortPhrase: 'el durazno',
    longPhrase: 'como un durazno',
    drawing: 'img/objects/durazno.svg',
  },
  { id: 'coco', word: 'coco', shortPhrase: 'el coco', longPhrase: 'el coco es duro', drawing: 'img/objects/coco.svg' },
  {
    id: 'tomate',
    word: 'tomate',
    shortPhrase: 'el tomate',
    longPhrase: 'el tomate es rojo',
    drawing: 'img/objects/tomate.svg',
  },
  {
    id: 'maiz',
    word: 'maíz',
    shortPhrase: 'el maíz',
    longPhrase: 'el maíz es amarillo',
    drawing: 'img/objects/maiz.svg',
  },
  { id: 'pan', word: 'pan', shortPhrase: 'el pan', longPhrase: 'el pan está rico', drawing: 'img/objects/pan.svg' },
  {
    id: 'queso',
    word: 'queso',
    shortPhrase: 'el queso',
    longPhrase: 'el queso es amarillo',
    drawing: 'img/objects/queso.svg',
  },
  {
    id: 'huevo',
    word: 'huevo',
    shortPhrase: 'el huevo',
    longPhrase: 'el huevo se rompe',
    drawing: 'img/objects/huevo.svg',
  },
  {
    id: 'leche',
    word: 'leche',
    shortPhrase: 'la leche',
    longPhrase: 'tomo mi leche',
    drawing: 'img/objects/leche.svg',
  },
  {
    id: 'helado',
    word: 'helado',
    shortPhrase: 'el helado',
    longPhrase: 'el helado está frío',
    drawing: 'img/objects/helado.svg',
  },
  {
    id: 'pastel',
    word: 'pastel',
    shortPhrase: 'el pastel',
    longPhrase: 'el pastel tiene velas',
    drawing: 'img/objects/pastel.svg',
  },
  {
    id: 'galleta',
    word: 'galleta',
    shortPhrase: 'la galleta',
    longPhrase: 'como una galleta',
    drawing: 'img/objects/galleta.svg',
  },
  {
    id: 'pizza',
    word: 'pizza',
    shortPhrase: 'la pizza',
    longPhrase: 'la pizza está caliente',
    drawing: 'img/objects/pizza.svg',
  },
  {
    id: 'hamburguesa',
    word: 'hamburguesa',
    shortPhrase: 'la hamburguesa',
    longPhrase: 'como una hamburguesa',
    drawing: 'img/objects/hamburguesa.svg',
  },
  {
    id: 'chocolate',
    word: 'chocolate',
    shortPhrase: 'el chocolate',
    longPhrase: 'el chocolate es dulce',
    drawing: 'img/objects/chocolate.svg',
  },
  {
    id: 'brocoli',
    word: 'brócoli',
    shortPhrase: 'el brócoli',
    longPhrase: 'el brócoli es verde',
    drawing: 'img/objects/brocoli.svg',
  },
  {
    id: 'pepino',
    word: 'pepino',
    shortPhrase: 'el pepino',
    longPhrase: 'el pepino es verde',
    drawing: 'img/objects/pepino.svg',
  },
  {
    id: 'hongo',
    word: 'hongo',
    shortPhrase: 'el hongo',
    longPhrase: 'el hongo es rojo',
    drawing: 'img/objects/hongo.svg',
  },
  {
    id: 'miel',
    word: 'miel',
    shortPhrase: 'la miel',
    longPhrase: 'la abeja hace miel',
    drawing: 'img/objects/miel.svg',
  },
  {
    id: 'arroz',
    word: 'arroz',
    shortPhrase: 'el arroz',
    longPhrase: 'el arroz es blanco',
    drawing: 'img/objects/arroz.svg',
  },
  {
    id: 'mango',
    word: 'mango',
    shortPhrase: 'el mango',
    longPhrase: 'el mango es dulce',
    drawing: 'img/objects/mango.svg',
  },
  {
    id: 'aguacate',
    word: 'aguacate',
    shortPhrase: 'el aguacate',
    longPhrase: 'el aguacate es verde',
    drawing: 'img/objects/aguacate.svg',
  },
  {
    id: 'cebolla',
    word: 'cebolla',
    shortPhrase: 'la cebolla',
    longPhrase: 'corto la cebolla',
    drawing: 'img/objects/cebolla.svg',
  },
  {
    id: 'cama',
    word: 'cama',
    shortPhrase: 'la cama',
    longPhrase: 'duermo en mi cama',
    drawing: 'img/objects/cama.svg',
  },
  {
    id: 'silla',
    word: 'silla',
    shortPhrase: 'la silla',
    longPhrase: 'la silla tiene patas',
    drawing: 'img/objects/silla.svg',
  },
  {
    id: 'puerta',
    word: 'puerta',
    shortPhrase: 'la puerta',
    longPhrase: 'la puerta se abre',
    drawing: 'img/objects/puerta.svg',
  },
  {
    id: 'ventana',
    word: 'ventana',
    shortPhrase: 'la ventana',
    longPhrase: 'abro la ventana',
    drawing: 'img/objects/ventana.svg',
  },
  {
    id: 'reloj',
    word: 'reloj',
    shortPhrase: 'el reloj',
    longPhrase: 'el reloj suena',
    drawing: 'img/objects/reloj.svg',
  },
  { id: 'vela', word: 'vela', shortPhrase: 'la vela', longPhrase: 'la vela alumbra', drawing: 'img/objects/vela.svg' },
  {
    id: 'taza',
    word: 'taza',
    shortPhrase: 'la taza',
    longPhrase: 'la taza está caliente',
    drawing: 'img/objects/taza.svg',
  },
  {
    id: 'cuchara',
    word: 'cuchara',
    shortPhrase: 'la cuchara',
    longPhrase: 'como con cuchara',
    drawing: 'img/objects/cuchara.svg',
  },
  {
    id: 'escoba',
    word: 'escoba',
    shortPhrase: 'la escoba',
    longPhrase: 'barro con la escoba',
    drawing: 'img/objects/escoba.svg',
  },
  {
    id: 'jabon',
    word: 'jabón',
    shortPhrase: 'el jabón',
    longPhrase: 'me lavo con jabón',
    drawing: 'img/objects/jabon.svg',
  },
  {
    id: 'cepillo',
    word: 'cepillo',
    shortPhrase: 'el cepillo',
    longPhrase: 'lavo mis dientes',
    drawing: 'img/objects/cepillo.svg',
  },
  {
    id: 'tijera',
    word: 'tijera',
    shortPhrase: 'la tijera',
    longPhrase: 'la tijera corta',
    drawing: 'img/objects/tijera.svg',
  },
  {
    id: 'lapiz',
    word: 'lápiz',
    shortPhrase: 'el lápiz',
    longPhrase: 'escribo con lápiz',
    drawing: 'img/objects/lapiz.svg',
  },
  {
    id: 'crayon',
    word: 'crayón',
    shortPhrase: 'el crayón',
    longPhrase: 'pinto con crayón',
    drawing: 'img/objects/crayon.svg',
  },
  {
    id: 'mochila',
    word: 'mochila',
    shortPhrase: 'la mochila',
    longPhrase: 'llevo mi mochila',
    drawing: 'img/objects/mochila.svg',
  },
  {
    id: 'regalo',
    word: 'regalo',
    shortPhrase: 'el regalo',
    longPhrase: 'abro el regalo',
    drawing: 'img/objects/regalo.svg',
  },
  {
    id: 'globo',
    word: 'globo',
    shortPhrase: 'el globo',
    longPhrase: 'el globo vuela',
    drawing: 'img/objects/globo.svg',
  },
  {
    id: 'pelota',
    word: 'pelota',
    shortPhrase: 'la pelota',
    longPhrase: 'pateo la pelota',
    drawing: 'img/objects/pelota.svg',
  },
  {
    id: 'peluche',
    word: 'peluche',
    shortPhrase: 'el peluche',
    longPhrase: 'abrazo mi peluche',
    drawing: 'img/objects/peluche.svg',
  },
  {
    id: 'cometa',
    word: 'cometa',
    shortPhrase: 'la cometa',
    longPhrase: 'la cometa vuela',
    drawing: 'img/objects/cometa.svg',
  },
  {
    id: 'tambor',
    word: 'tambor',
    shortPhrase: 'el tambor',
    longPhrase: 'toco el tambor',
    drawing: 'img/objects/tambor.svg',
  },
  {
    id: 'guitarra',
    word: 'guitarra',
    shortPhrase: 'la guitarra',
    longPhrase: 'toco la guitarra',
    drawing: 'img/objects/guitarra.svg',
  },
  {
    id: 'trompeta',
    word: 'trompeta',
    shortPhrase: 'la trompeta',
    longPhrase: 'toco la trompeta',
    drawing: 'img/objects/trompeta.svg',
  },
  {
    id: 'piano',
    word: 'piano',
    shortPhrase: 'el piano',
    longPhrase: 'toco el piano',
    drawing: 'img/objects/piano.svg',
  },
  {
    id: 'campana',
    word: 'campana',
    shortPhrase: 'la campana',
    longPhrase: 'la campana suena',
    drawing: 'img/objects/campana.svg',
  },
  {
    id: 'gorra',
    word: 'gorra',
    shortPhrase: 'la gorra',
    longPhrase: 'me pongo la gorra',
    drawing: 'img/objects/gorra.svg',
  },
  {
    id: 'zapato',
    word: 'zapato',
    shortPhrase: 'el zapato',
    longPhrase: 'me pongo el zapato',
    drawing: 'img/objects/zapato.svg',
  },
  {
    id: 'calcetin',
    word: 'calcetín',
    shortPhrase: 'el calcetín',
    longPhrase: 'me pongo el calcetín',
    drawing: 'img/objects/calcetin.svg',
  },
  {
    id: 'camiseta',
    word: 'camiseta',
    shortPhrase: 'la camiseta',
    longPhrase: 'me pongo la camiseta',
    drawing: 'img/objects/camiseta.svg',
  },
  {
    id: 'pantalon',
    word: 'pantalón',
    shortPhrase: 'el pantalón',
    longPhrase: 'me pongo el pantalón',
    drawing: 'img/objects/pantalon.svg',
  },
  {
    id: 'vestido',
    word: 'vestido',
    shortPhrase: 'el vestido',
    longPhrase: 'el vestido es bonito',
    drawing: 'img/objects/vestido.svg',
  },
  {
    id: 'corona',
    word: 'corona',
    shortPhrase: 'la corona',
    longPhrase: 'el rey tiene corona',
    drawing: 'img/objects/corona.svg',
  },
  {
    id: 'anillo',
    word: 'anillo',
    shortPhrase: 'el anillo',
    longPhrase: 'el anillo brilla',
    drawing: 'img/objects/anillo.svg',
  },
  {
    id: 'martillo',
    word: 'martillo',
    shortPhrase: 'el martillo',
    longPhrase: 'el martillo golpea',
    drawing: 'img/objects/martillo.svg',
  },
  { id: 'caja', word: 'caja', shortPhrase: 'la caja', longPhrase: 'abro la caja', drawing: 'img/objects/caja.svg' },
  { id: 'auto', word: 'auto', shortPhrase: 'el auto', longPhrase: 'el auto es rojo', drawing: 'img/objects/auto.svg' },
  {
    id: 'autobus',
    word: 'autobús',
    shortPhrase: 'el autobús',
    longPhrase: 'el autobús para',
    drawing: 'img/objects/autobus.svg',
  },
  {
    id: 'barco',
    word: 'barco',
    shortPhrase: 'el barco',
    longPhrase: 'el barco navega',
    drawing: 'img/objects/barco.svg',
  },
  {
    id: 'camion',
    word: 'camión',
    shortPhrase: 'el camión',
    longPhrase: 'el camión es grande',
    drawing: 'img/objects/camion.svg',
  },
  { id: 'moto', word: 'moto', shortPhrase: 'la moto', longPhrase: 'la moto corre', drawing: 'img/objects/moto.svg' },
  {
    id: 'helicoptero',
    word: 'helicóptero',
    shortPhrase: 'el helicóptero',
    longPhrase: 'el helicóptero vuela',
    drawing: 'img/objects/helicoptero.svg',
  },
  {
    id: 'tractor',
    word: 'tractor',
    shortPhrase: 'el tractor',
    longPhrase: 'el tractor trabaja',
    drawing: 'img/objects/tractor.svg',
  },
  {
    id: 'ambulancia',
    word: 'ambulancia',
    shortPhrase: 'la ambulancia',
    longPhrase: 'la ambulancia corre',
    drawing: 'img/objects/ambulancia.svg',
  },
  {
    id: 'patineta',
    word: 'patineta',
    shortPhrase: 'la patineta',
    longPhrase: 'subo a la patineta',
    drawing: 'img/objects/patineta.svg',
  },
  {
    id: 'taxi',
    word: 'taxi',
    shortPhrase: 'el taxi',
    longPhrase: 'el taxi es amarillo',
    drawing: 'img/objects/taxi.svg',
  },
  {
    id: 'nube',
    word: 'nube',
    shortPhrase: 'la nube',
    longPhrase: 'la nube es blanca',
    drawing: 'img/objects/nube.svg',
  },
  {
    id: 'lluvia',
    word: 'lluvia',
    shortPhrase: 'la lluvia',
    longPhrase: 'la lluvia moja',
    drawing: 'img/objects/lluvia.svg',
  },
  {
    id: 'arcoiris',
    word: 'arcoíris',
    shortPhrase: 'el arcoíris',
    longPhrase: 'el arcoíris tiene colores',
    drawing: 'img/objects/arcoiris.svg',
  },
  { id: 'rayo', word: 'rayo', shortPhrase: 'el rayo', longPhrase: 'el rayo brilla', drawing: 'img/objects/rayo.svg' },
  {
    id: 'fuego',
    word: 'fuego',
    shortPhrase: 'el fuego',
    longPhrase: 'el fuego quema',
    drawing: 'img/objects/fuego.svg',
  },
  { id: 'hoja', word: 'hoja', shortPhrase: 'la hoja', longPhrase: 'la hoja cae', drawing: 'img/objects/hoja.svg' },
  {
    id: 'cactus',
    word: 'cactus',
    shortPhrase: 'el cactus',
    longPhrase: 'el cactus pica',
    drawing: 'img/objects/cactus.svg',
  },
  {
    id: 'girasol',
    word: 'girasol',
    shortPhrase: 'el girasol',
    longPhrase: 'el girasol es amarillo',
    drawing: 'img/objects/girasol.svg',
  },
  {
    id: 'rosa',
    word: 'rosa',
    shortPhrase: 'la rosa',
    longPhrase: 'la rosa huele rico',
    drawing: 'img/objects/rosa.svg',
  },
  {
    id: 'volcan',
    word: 'volcán',
    shortPhrase: 'el volcán',
    longPhrase: 'el volcán es alto',
    drawing: 'img/objects/volcan.svg',
  },
  {
    id: 'montana',
    word: 'montaña',
    shortPhrase: 'la montaña',
    longPhrase: 'la montaña es alta',
    drawing: 'img/objects/montana.svg',
  },
  {
    id: 'playa',
    word: 'playa',
    shortPhrase: 'la playa',
    longPhrase: 'jugamos en la playa',
    drawing: 'img/objects/playa.svg',
  },
  {
    id: 'planeta',
    word: 'planeta',
    shortPhrase: 'el planeta',
    longPhrase: 'el planeta gira',
    drawing: 'img/objects/planeta.svg',
  },
  {
    id: 'mundo',
    word: 'mundo',
    shortPhrase: 'el mundo',
    longPhrase: 'el mundo es redondo',
    drawing: 'img/objects/mundo.svg',
  },
  { id: 'gota', word: 'gota', shortPhrase: 'la gota', longPhrase: 'la gota cae', drawing: 'img/objects/gota.svg' },
  { id: 'ola', word: 'ola', shortPhrase: 'la ola', longPhrase: 'la ola moja', drawing: 'img/objects/ola.svg' },
  {
    id: 'piedra',
    word: 'piedra',
    shortPhrase: 'la piedra',
    longPhrase: 'la piedra es dura',
    drawing: 'img/objects/piedra.svg',
  },
  {
    id: 'concha',
    word: 'concha',
    shortPhrase: 'la concha',
    longPhrase: 'la concha es bonita',
    drawing: 'img/objects/concha.svg',
  },
  { id: 'ojo', word: 'ojo', shortPhrase: 'el ojo', longPhrase: 'el ojo mira', drawing: 'img/objects/ojo.svg' },
  {
    id: 'diente',
    word: 'diente',
    shortPhrase: 'el diente',
    longPhrase: 'el diente es blanco',
    drawing: 'img/objects/diente.svg',
  },
  {
    id: 'corazon',
    word: 'corazón',
    shortPhrase: 'el corazón',
    longPhrase: 'mi corazón late',
    drawing: 'img/objects/corazon.svg',
  },
  { id: 'iman', word: 'imán', shortPhrase: 'el imán', longPhrase: 'el imán atrae', drawing: 'img/objects/iman.svg' },
  {
    id: 'candado',
    word: 'candado',
    shortPhrase: 'el candado',
    longPhrase: 'el candado cierra',
    drawing: 'img/objects/candado.svg',
  },
  {
    id: 'tetera',
    word: 'tetera',
    shortPhrase: 'la tetera',
    longPhrase: 'la tetera hierve',
    drawing: 'img/objects/tetera.svg',
  },
  {
    id: 'trofeo',
    word: 'trofeo',
    shortPhrase: 'el trofeo',
    longPhrase: 'gané un trofeo',
    drawing: 'img/objects/trofeo.svg',
  },
  {
    id: 'medalla',
    word: 'medalla',
    shortPhrase: 'la medalla',
    longPhrase: 'la medalla brilla',
    drawing: 'img/objects/medalla.svg',
  },
  { id: 'lupa', word: 'lupa', shortPhrase: 'la lupa', longPhrase: 'miro con lupa', drawing: 'img/objects/lupa.svg' },
  {
    id: 'canasta',
    word: 'canasta',
    shortPhrase: 'la canasta',
    longPhrase: 'la canasta tiene fruta',
    drawing: 'img/objects/canasta.svg',
  },
  {
    id: 'robot',
    word: 'robot',
    shortPhrase: 'el robot',
    longPhrase: 'el robot camina',
    drawing: 'img/objects/robot.svg',
  },
  {
    id: 'espejo',
    word: 'espejo',
    shortPhrase: 'el espejo',
    longPhrase: 'me miro al espejo',
    drawing: 'img/objects/espejo.svg',
  },
  {
    id: 'esponja',
    word: 'esponja',
    shortPhrase: 'la esponja',
    longPhrase: 'la esponja es suave',
    drawing: 'img/objects/esponja.svg',
  },
  {
    id: 'balde',
    word: 'balde',
    shortPhrase: 'el balde',
    longPhrase: 'el balde tiene agua',
    drawing: 'img/objects/balde.svg',
  },
];

/** Máximo de objetos de casa guardados (cada miniatura pesa unos 30 KB). */
export const MAX_SAVED_OBJECTS = 20;

/** Tamaños de imagen, en píxeles del lado más largo. */
export const PHOTO = { uploadSize: 768, thumbSize: 360, uploadQuality: 0.8, thumbQuality: 0.7 };

/** Tiempo máximo que el adulto espera a la IA antes de que el cliente corte. */
export const DESCRIBE_TIMEOUT_MS = 110_000;

/** Todos los tiempos del juego, en milisegundos, en un solo lugar. */
export const TIMING = {
  beforeShow: 600, // respiro antes de la consigna
  nextRound: 1800, // pausa tras armar todo, antes de pedir que lo diga
  saidPause: 1400, // pausa tras "Lo dijo" o "Seguir", antes de la ronda siguiente
  helpStep: 700, // pausa de la ayuda
  endButtons: 4000, // los botones del final aparecen después de esto
  shake: 350, // duración del toque suave (la pieza se hunde) al equivocarse
  hop: 600, // salto del avatar al acertar
};

/** Consejos generales del desplegable "Para el adulto". */
export const GENERAL_TIPS = [
  'Si elige mal, no digas "no": tras dos intentos la voz muestra la pieza que sigue.',
  'Espera 5 segundos antes de ayudar.',
  'Con "Objetos de casa" (en el inicio) puedes jugar con fotos de sus cosas.',
];

/** Mensajes del panel "Objetos de casa" (para el adulto). */
export const PHOTO_MESSAGES = {
  preparing: 'Preparando la foto…',
  waiting: 'Mirando la foto…',
  ready: 'Listo. Revisa la palabra y las frases, y guarda.',
  offline: 'Sin internet. Escribe tú la palabra: el resto funciona igual.',
  busy: 'La IA está muy ocupada o se acabaron las fotos de hoy. Escribe tú la palabra o prueba más tarde.',
  unclear: 'No se reconoció un objeto. Prueba otra foto (solo el objeto, con buena luz) o escribe la palabra.',
  config: 'La IA no está configurada en este sitio. Escribe tú la palabra.',
  failed: 'No se pudo leer la foto. Escribe tú la palabra.',
  cancelled: 'Cancelado. Escribe tú la palabra.',
  badPhoto: 'No se pudo abrir esa imagen. Prueba con otra.',
  badWord: 'La palabra debe tener solo letras (sin espacios ni números).',
  badShort: 'La frase corta debe tener 2 palabras, o quedar vacía.',
  badLong: 'La frase larga debe tener 3 o 4 palabras, o quedar vacía.',
  saved: 'Guardado. La próxima sesión empieza con este objeto.',
  full: 'No hay más espacio: se borraron los objetos más viejos.',
};

/** Textos fijos de la voz y de la interfaz (frases para el niño: 4 palabras o menos). */
export const TEXT = {
  hello: '¡Hola! ¿Jugamos?',
  twoMore: 'Dos más y terminamos.',
  lastOne: 'La última y terminamos.',
  build: 'Armemos',
  almost: '¡Casi! Otra vez.',
  next: 'Esta sigue.',
  great: '¡Muy bien!',
  sayIt: 'Ahora dilo tú.',
  saidIt: '¡Muy bien dicho!',
  endTitle: '¡Lo hicimos juntos!',
  endSpeech: '¡Lo hicimos juntos!',
};
