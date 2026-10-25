/**
 * Ayudas compartidas por las pruebas.
 */

/**
 * Números al azar repetibles: así, si una prueba falla, falla siempre igual.
 * Generador congruencial lineal (el mismo de la serie de juegos).
 * @param {number} [seed]
 * @returns {() => number}
 */
export function seededRandom(seed = 42) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

/**
 * localStorage mínimo para Node: guarda en un Map. `failing: true` simula un
 * navegador que no deja guardar (modo incógnito estricto o espacio lleno).
 * `quota` (caracteres) simula un almacenamiento que se llena: lanza un error
 * llamado QuotaExceededError, como el navegador.
 * @param {{ failing?: boolean, quota?: number }} [options]
 */
export function createMemoryStorage({ failing = false, quota = Infinity } = {}) {
  const data = new Map();
  return {
    /** @param {string} key */
    getItem(key) {
      if (failing) throw new Error('SecurityError');
      return data.has(key) ? data.get(key) : null;
    },
    /** @param {string} key @param {string} value */
    setItem(key, value) {
      if (failing) throw new Error('SecurityError');
      if (String(value).length > quota) {
        const error = new Error('lleno');
        error.name = 'QuotaExceededError';
        throw error;
      }
      data.set(key, String(value));
    },
    /** @param {string} key */
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

/**
 * Reemplaza globalThis.localStorage durante una prueba.
 * Node 22+ trae un localStorage experimental; aquí siempre se usa el simulado.
 * @param {ReturnType<typeof createMemoryStorage>} storage
 * @returns {() => void} función para restaurar el original
 */
export function useStorage(storage) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  return () => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  };
}
