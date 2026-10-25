# Mira y Dime

Juego para niñas y niños de **3 a 7 años**: arman la palabra o la frase de lo que miran, tocando piezas de madera. Tiene cuatro modos:

- **Letras** (el primero): arma la palabra letra por letra. La casilla muestra la letra tenue, así empareja formas sin saber leer.
- **Sílabas**: "pe · lo · ta". Ella toca la sílaba que sigue y la pieza va a su casilla.
- **Frase corta**: dos palabras ("el gato").
- **Frase larga**: tres o cuatro palabras ("el gato duerme").

Al terminar, la voz dice "Ahora dilo tú" y el adulto toca **Lo dijo** (o **Seguir**). No hay micrófono ni reconocimiento de voz.

Cada modo tiene tres niveles y sesiones de 3, 5 u 8 rondas. Trae **184 objetos dibujados** (animales, comida, juguetes, vehículos, naturaleza…), cada uno con su palabra, una frase corta y una frase larga.

**Objetos de casa (oculto por ahora).** El panel para sumar objetos con una foto y una IA sigue en el código y en las pruebas, pero el botón del inicio tiene `hidden`. Para volver a mostrarlo, quita `hidden` del botón `data-action="open-objects"` en `index.html` y la línea que lo comprueba en `tests/e2e/smoke.spec.js`.

Es de la misma serie que _Memo Colores_ y _Dados y Tapitas_: se armó copiando `code/memo-colores/` según `docs/knowledge/NEW-GAME-PROMPT.md`. Es **HTML, CSS y JavaScript sin framework ni compilación**, más una sola función de servidor (`functions/api/describe.js`) para la IA de las fotos.

- Qué datos guarda y qué sale del dispositivo: [PRIVACY.md](PRIVACY.md)
- Seguridad: [SECURITY.md](SECURITY.md) · Decisiones: [ARCHITECTURE.md](ARCHITECTURE.md) · Cambios: [CHANGELOG.md](CHANGELOG.md)

## Cómo abrirlo

```bash
npm start   # Node 22+. http://localhost:3001, con las cabeceras de _headers
```

Así se juega todo, con los objetos dibujados y con objetos escritos a mano. Las fotos con IA necesitan el servidor de Cloudflare (ver más abajo). Sin él, el panel avisa y deja escribir la palabra.

## Pruebas

```bash
npm install && npx playwright install chromium   # una vez
npm test               # unitarias (node:test)
npm run test:e2e       # recorridos en el navegador, 390×844 y 1366×900
npm run check          # lint, formato, tipos, sintaxis, HTML, cobertura ≥ 90 % y recorridos
```

- **Unitarias:**
  - el separador silábico, con 45 palabras que cubren cada regla (dígrafos, grupos inseparables, diptongos e hiatos, "gue/gui/güe")
  - el banco de piezas: la que sigue siempre está y las demás no se mueven
  - el plan de la sesión
  - la validación de lo guardado y de lo que propone la IA
  - el estado del juego con reloj simulado
  - `/api/describe` con un OpenRouter falso: lento, saturado (429/503), respuestas rotas y sin clave
- **Recorridos:**
  - los 4 modos × 3 niveles hasta el final
  - dos errores con la ayuda completa y toques en ráfaga
  - el camino de las fotos (IA simulada, saturada, sin internet, a mano y datos maliciosos guardados)
  - teclado, sin internet, axe-core (WCAG 2.2 AA) y 20 sesiones sin fugas de memoria
  - cualquier error en la consola hace fallar la prueba

## Estructura

```
index.html              las 3 pantallas, el panel de ajustes y el de objetos de casa; SEO y Open Graph
css/styles.css          estilos de la serie (secciones 1-3 iguales a Memo Colores)
js/
  main.js               arranque y clics (data-action)
  game.js               estado y acciones: rondas, ayuda, "Lo dijo", final
  rules.js              lógica pura: plan de la sesión, piezas, banco
  spanish.js            separar en sílabas, letras y palabras
  render.js             dibuja desde el estado
  objects.js            objetos de casa en localStorage, validados
  photo.js              achica la foto y llama a /api/describe
  objects-panel.js      el panel "Objetos de casa"
  settings-panel.js     ajustes para adultos
  install.js            "Instalar en el celular" (dentro de ajustes)
  config.js             modos, niveles, objetos de fábrica, textos y tiempos
  audio.js, storage.js, dom.js, icons.js, mascot.js   copiados de la serie
server/describe.js      lógica de la IA (reintentos, validación), sin Cloudflare
functions/api/describe.js   Cloudflare Pages Function: POST /api/describe
wrangler.jsonc          configuración de Cloudflare Pages (sin secretos)
img/objects/            184 dibujos de Fluent Emoji (SVG) + LICENSE
icons/                  ícono de la app, og-image.png (1200×630) y capturas del manifiesto
manifest.webmanifest    instalar como app
robots.txt, sitemap.xml para buscadores
```

Flujo: `data-action → main.js → game.js → state → notify() → render.js`. Solo `game.js` cambia el estado.

## IA de las fotos (Cloudflare Pages + OpenRouter)

1. El adulto toca **Tomar foto**. El navegador la achica a 768 px y la vuelve a codificar en JPEG con un `<canvas>`, lo que borra GPS y metadatos.
2. La página manda la foto a **nuestro** `/api/describe`. El navegador nunca habla con OpenRouter y nunca ve la clave.
3. `server/describe.js` le pregunta a `openrouter/free`, que elige un modelo gratuito capaz de ver imágenes:
   - cada intento corta a los 30 s, y el total a los 100 s
   - con 429 o 5xx reintenta hasta 4 veces, esperando 1, 2 y 4 s más un poco de azar, y respeta `Retry-After` hasta 10 s; cada reintento puede caer en otro modelo
   - si la respuesta no trae JSON o las frases tienen el largo equivocado, cuenta como fallo y reintenta
   - con una clave inválida o sin crédito (401, 402 o 403) no reintenta
4. Mientras tanto, el adulto ve "Mirando la foto… 12 s" junto a **Cancelar**, y puede escribir la palabra cuando quiera. Lo que escribe manda sobre la IA. La niña no ve nada de esta espera.

**Límites de OpenRouter para modelos gratuitos.** El tope es por minuto y por día, y sube si la cuenta compró créditos. Cuando se agota, el panel dice "La IA está muy ocupada o se acabaron las fotos de hoy" y deja escribir la palabra.

### Configurar la clave (una vez)

```bash
npx wrangler pages secret put OPENROUTER_API_KEY --project-name mira-y-dime
```

La clave queda guardada en Cloudflare y no aparece en el repositorio ni en el navegador. Para probar la IA en local, escribe `OPENROUTER_API_KEY=...` en `.dev.vars`, que está en `.gitignore`, y corre `npx wrangler pages dev .`.

> **Cuidado:** publica desde Git (Cloudflare Pages conectado al repositorio), donde `.dev.vars` no existe. Si publicas con `wrangler pages deploy .` desde tu carpeta, primero borra `.dev.vars`.

## Despliegue

**Cloudflare Pages** es el recomendado, porque es el único que corre `functions/`:

- comando de build: ninguno
- carpeta de salida: `/`
- secret: `OPENROUTER_API_KEY`

En Netlify o GitHub Pages el juego funciona igual, pero sin IA: el panel pide escribir la palabra. GitHub Pages además pierde las cabeceras de `_headers` (ver SECURITY.md).

**Dominio.** Las etiquetas Open Graph necesitan URLs absolutas. Están escritas para `https://mira-y-dime.pages.dev/`, el dominio que da Cloudflare al proyecto `mira-y-dime`. Si publicas en otro dominio, cámbialo en `index.html` (canonical, `og:url`, `og:image`), `robots.txt` y `sitemap.xml`. `tests/seo.test.js` falla si no coinciden. Para probar la vista previa ya publicada: [opengraph.xyz](https://www.opengraph.xyz) o el depurador de Facebook.

**Instalar en el celular.** Android/Chrome: en _Ajustes para adultos_ aparece **Instalar** cuando el navegador lo permite, es decir, en HTTPS y después de una visita con el service worker activo. iPhone/iPad: la misma sección explica _Compartir → Agregar a inicio_. Instalado, abre a pantalla completa y funciona sin internet.

**Service worker.** Usa "primero la red". Al agregar un módulo, súmalo a `FILES` en `sw.js` y a los `modulepreload` de `index.html`, y sube `VERSION`. `tests/assets.test.js` falla si se te olvida. Nunca guarda en caché `/api`, porque solo atiende pedidos GET.

## Decisiones para el niño

- **El error no castiga.** Suena un tono suave, la pieza se hunde y la voz dice "¡Casi! Otra vez.". Tras 2 fallos seguidos, dice "Esta sigue." y marca la pieza con borde dorado.
- **Pantalla previsible.** La maqueta es siempre la misma: dibujo, mesa con casillas y banco de 2 a 4 piezas. Las piezas que no se tocan no cambian de lugar.
- **Voz modelo.** Frases de 4 palabras o menos, y las frases de más de 4 palabras no se usan. "Armemos perro.", cada pieza en voz alta, "¡Perro! ¡Muy bien!", "Ahora dilo tú."
- **Cierre anunciado.** La voz dice "Dos más y terminamos" y luego "¡Lo hicimos juntos!". Los botones del final aparecen a los 4 s.
- **Calma.** Sin confeti ni parpadeos: la pieza baja a su casilla y el dibujo hace un solo "pop". Con "reducir movimiento" activado no hay animaciones.

## Créditos

- Íconos de la interfaz: [Lucide](https://lucide.dev), ISC.
- Dibujos de los objetos: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (estilo Flat), MIT, © Microsoft. SVG sin cambios en `img/objects/` con su `LICENSE`.
- Letra: Fredoka, SIL OFL 1.1 (`fonts/OFL.txt`).

## Licencia

[MIT](LICENSE) © 2026 Enrique Lazo Bello (ENLABE), The Bunker Code y colaboradores.
