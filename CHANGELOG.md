# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.0.0] — 2026-10-25

Primera versión. Mira y Dime 1.0.0 (estilos, mascota, audio, ajustes, service worker, CSP y herramientas).

### Agregado

- Cuatro modos: Letras (el primero), Sílabas, Frase corta y Frase larga. Cada uno con tres niveles.
- Separador silábico del español (`spanish.js`), probado con 45 palabras.
- 184 objetos dibujados con Fluent Emoji (Flat, MIT), cada uno con palabra, frase corta y frase larga, para jugar sin fotos y sin internet.
- Objetos de casa (botón oculto por ahora; el código y sus pruebas siguen): foto, palabra que propone la IA y que el adulto revisa, frases, galería de hasta 20 objetos. También se pueden escribir a mano.
- `/api/describe` en un Cloudflare Worker (`worker/index.js`, archivos estáticos con `.assetsignore`) con OpenRouter (`openrouter/free`): reintentos con espera creciente, tope por intento y total, y validación de la respuesta.
- Paso "Ahora dilo tú" con los botones "Lo dijo" y "Seguir". La pantalla final muestra cuántas veces lo dijo.
- Tema verde para Frase larga.
- Ícono propio de la app: globo de diálogo con dos piezas de madera ("M" y "A"). SVG fuente en `icons/icon.svg`; PNG generados con `rsvg-convert` (la versión maskable usa escala 0,7 para la zona segura).
- SEO y Open Graph: descripción, canonical, `og:*` y `twitter:card` con imagen de 1200×630, `robots.txt` y `sitemap.xml`.
- Instalar como app: "Instalar en el celular" en Ajustes (botón en Android/Chrome, pasos en iPhone), manifiesto con `id`, categorías y capturas.
