# Seguridad

## Modelo de amenazas

Sitio estático más una función de servidor (`/api/describe`). El adulto puede escribir texto: palabra y frases. La IA también devuelve texto. Todo eso se trata como **no confiable**.

| Amenaza                                                     | Cómo se mitiga                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XSS con la palabra del adulto, de la IA o de `localStorage` | `normalizeObject()` (`objects.js`) solo acepta letras del español y fotos `data:image/jpeg;base64,…`. Además, `render.js` y `objects-panel.js` pasan todo por `escapeHTML`. La CSP prohíbe scripts escritos en el HTML. Pruebas: `tests/objects.test.js` y `tests/e2e/objects.spec.js`, que guarda `<img onerror>` y una foto `javascript:`. |
| Clave de OpenRouter expuesta                                | Vive como secret de Cloudflare (`OPENROUTER_API_KEY`). El navegador solo habla con `/api` (`connect-src 'self'`). `.dev.vars` está en `.gitignore`.                                                                                                                                                                                          |
| Otro sitio gasta nuestro límite diario de la IA             | `/api/describe` rechaza pedidos con un `Origin` distinto al del sitio. Es un freno, no un bloqueo: alguien con `curl` puede llamarlo. Si se abusa, conviene agregar Cloudflare Rate Limiting o Turnstile.                                                                                                                                    |
| Pedidos enormes o basura al servidor                        | Tope de 1,5 MB y solo JPEG en base64. Si no cumple, responde 400 sin llamar a la IA.                                                                                                                                                                                                                                                         |
| Respuesta maliciosa o rota del modelo                       | `parseModelReply()` valida la palabra y el largo de cada frase. Si algo falla, reintenta; nunca reenvía el texto del modelo sin validar.                                                                                                                                                                                                     |
| Datos corruptos en `localStorage`                           | `normalizeSettings()` y `normalizeObjects()` usan listas cerradas, tienen topes y vuelven a los valores por defecto.                                                                                                                                                                                                                         |
| Terceros comprometidos                                      | Sin CDN y sin peticiones del navegador a otros sitios.                                                                                                                                                                                                                                                                                       |

## Content Security Policy

Igual que en Memo Colores (`_headers` y `<meta>`), con un cambio: `img-src 'self' data: blob:`, para mostrar la foto que arma nuestro propio `<canvas>`. Se mantienen `connect-src 'self'`, `script-src 'self'` y `style-src 'self'` sin `'unsafe-inline'`, y `form-action 'none'`, porque los formularios usan `preventDefault`.

`Permissions-Policy: camera=()` se mantiene. `<input type="file" capture="environment">` abre la cámara del sistema, no `getUserMedia`, así que la página nunca accede a la cámara.

## Service worker

Atiende solo GET del mismo origen, así que `/api/describe` (POST) nunca se guarda en caché.

## Cómo reportar un problema

Abre un _issue_ en el repositorio.
