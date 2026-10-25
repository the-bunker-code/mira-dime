# Privacidad

Mira y Dime lo usan niñas y niños pequeños. Regla: **no se recoge nada del niño**. La única excepción es una foto que el adulto decide enviar, y está explicada abajo.

## Qué se guarda (solo en este dispositivo)

| Clave de `localStorage`   | Qué tiene                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `mira-y-dime:settings:v1` | Modo, nivel, rondas (3, 5 u 8), voz y sonido sí/no                                                |
| `mira-y-dime:objects:v1`  | Objetos de casa: palabra, dos frases y una miniatura de 360 px de la foto. Como mucho 20 objetos. |

No se guarda nombre, edad, puntajes, grabaciones ni historial. Lo que cuenta "Lo dijo" se olvida al cerrar la sesión.

## Qué sale del dispositivo

**Por defecto, nada.** La letra, los íconos y los sonidos están en el propio sitio. No hay analíticas, cookies ni publicidad.

**Solo cuando el adulto toca "Tomar foto":**

1. La foto se achica a 768 px y se vuelve a codificar en el navegador, lo que borra GPS, fecha y modelo del teléfono.
2. Va a nuestro servidor (`/api/describe`, en Cloudflare), que la reenvía a **OpenRouter** y no la guarda.
3. OpenRouter la pasa a un **modelo gratuito** elegido al azar. Según el proveedor, los modelos gratuitos pueden registrar lo que reciben o usarlo para entrenar.

Por eso:

- el panel pide fotografiar **solo el objeto, sin caras ni personas**
- se puede jugar sin enviar ninguna foto: "Escribir yo la palabra" funciona sin internet y no envía nada

**Voz.** El juego prefiere las voces instaladas en el dispositivo. Si solo hay voces de red (por ejemplo, las "Google" de Chrome), el navegador envía cada frase ("Armemos perro.") a su proveedor. Para evitarlo, apaga la voz en _Ajustes para adultos_.

## Cómo borrar los datos

- Un objeto: "Objetos de casa" → botón de la papelera.
- Todo: Ajustes del navegador → Privacidad → Borrar datos del sitio.
