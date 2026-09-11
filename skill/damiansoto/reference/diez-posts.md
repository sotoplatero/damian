# Diez posts de una sola idea

Es `/tool/10-post-types` de damiansoto.me, llamado desde aquí. **Tú no escribes los posts: los
escribe el sitio.** Enséñalos tal cual.

## La entrada es texto, no una URL

Una idea escrita por la persona, con sus palabras. Puede venir muy suelta —dos líneas, un tema
a secas— o bien explicada. **El servidor exige al menos veinte caracteres** y corta a dos mil;
si llega más corto contesta `idea_short` y el script lo dice.

No le pidas que la desarrolle antes de llamar. La herramienta está hecha para trabajar con
poco: deduce el público y el ángulo de lo que haya, y avisa cuando la idea daba para poco.

## Paso gratis — el primero sale por aquí

```
node scripts/damiansoto.mjs posts "tu idea, con tus palabras"
```

Devuelve:

- **`posts`** — un solo post, el de tipo **Práctico**: un paso a paso de cómo se hace algo
  concreto del tema. Listo para copiar y pegar.
- **`topic`** — la idea ordenada por el servidor: `tema`, `publico`, `angulo` y `prueba`.
  **Enséñalo.** Es lo más barato de corregir y lo que más cambia los otros nueve: si el
  público o el ángulo están mal, lo mejor es rehacer el paso gratis con la idea mejor escrita
  antes de gastar el correo.
- **`confidence`** — `baja` si la idea era demasiado corta o vaga. Si viene así, dilo.

En `prueba` solo va lo que haya escrito la persona. Si está vacío, los posts que necesiten una
prueba dejan un hueco entre corchetes en vez de inventarse una cifra. Eso es a propósito y no
hay que rellenarlo por ella.

## Paso de pago — los otros nueve, al correo

Observación, esto vs. aquello, motivación, análisis, lista, a contracorriente, caso de éxito,
historia personal y meme. **No salen por la terminal.**

Antes de pedir el correo:

> Los otros nueve van a tu correo, no salen por aquí. Y esa dirección queda dada de alta en
> Objeto Brillante, la newsletter de Damian; te borras en un clic desde cualquier envío.

Con el sí:

```
node scripts/damiansoto.mjs posts --email tu@correo.com
```

No lleva la idea otra vez: el script reenvía el tema ordenado y el post gratis que ya tenía
guardados. Si contesta que falta el tema, repite el paso gratis.

## Lo que no hay que hacer

- **No escribas tú los otros nueve.** Los moldes de cada tipo están en el servidor, sacados de
  posts reales que funcionaron, y no están en este skill a propósito: son de sus autores.
- **No retoques el post gratis** ni le cambies el formato. El Práctico va en líneas separadas,
  una cosa por línea, y así tiene que salir.
- **No le añadas emojis ni hashtags.** La voz del sitio los excluye; si aparecen, los has
  puesto tú.
