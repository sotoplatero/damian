# Repropósito — diseño

Fecha: 2026-07-31
Ruta: `/tool/repurpose`
Nombre público: **Repropósito**

## Qué es

Pegas el enlace de un artículo tuyo y te lo devuelvo repartido en nueve piezas para
redes: tres notas de Substack, tres posts de X y tres de LinkedIn. Tres —una por
canal— se ven en pantalla, gratis. Las otras seis van por correo, más un bloque
corto que dice en qué orden publicarlas.

Para quien ya escribe y publica una vez y se queda ahí. El artículo está hecho: lo
que falta es sacarle las diez veces que se puede contar.

## Forma

La misma que `7-frameworks` y `10-post-types`: **algo entra → una parte gratis en
pantalla → el resto por correo a cambio de la dirección.** La mitad cara nunca llega
al navegador. Aquí lo que entra es una URL, como en `7-frameworks`, y se raspa con
`src/lib/server/scrape.ts` — mismas guardas SSRF, mismo corte a 6.000 caracteres.

## Decisiones ya tomadas

- **La entrada es una URL, no texto.** Un artículo pegado a mano son 2.000 palabras
  de fricción. No hay modo manual de caída: si el raspado falla, se dice por qué.
- **Tres piezas gratis, una por canal** (`nota-pregunta`, `x-corto`, `in-gancho`), y
  las seis restantes por correo. Se regala un tercio a propósito: quien entra ve de
  qué va cada canal, no solo el que le toque.
- **Las dos piezas que se apoyan en una cita van detrás del muro**, no gratis. No es
  comercial, es técnico: la cita se verifica contra el artículo *después* de que el
  modelo responda, y en el paso gratis la respuesta y la cita salen de la misma
  llamada — la comprobación llegaría cuando la cita ya está escrita. Detrás del muro
  se verifica antes de escribirlas. Por eso la nota gratis es `nota-pregunta` y no
  `nota-cita`.
- **No hay selector de plataforma.** Se valoró pedirla como entrada para elegir la
  pieza gratis; se cayó al enseñar una de cada canal, que cubre lo mismo sin un
  campo más.
- **En X, post largo, no hilo.** Un hilo es otra cosa que mantener; el post largo
  contiene el mismo argumento y se publica de una vez.
- **Las referencias son crédito, no esqueleto.** A diferencia de `7-frameworks` y
  `10-post-types`, donde el artículo fuente *es* el método y los `hint` se auditan
  contra él, aquí los nueve formatos son nuestros. Se citan al pie para no atarse a
  un solo contenido. Ver "Créditos".
- **Sí hay bloque de orden, no hay calendario de 14 días.** Cinco o seis líneas de
  qué va primero y por qué. Los días concretos envejecen mal y el modelo se los
  inventa.

## Los nueve formatos

Viven en `src/lib/tools/repurpose/formats.ts`, con la misma estructura que
`10-post-types/types.ts`: `id`, `channel`, `name`, `bestFor`, `hint`, `example`, y
`maxChars` cuando la plataforma manda.

| Canal | id | Qué es |
|---|---|---|
| Substack | `nota-pregunta` | La duda del artículo, puesta como pregunta a los suscriptores. **Gratis.** |
| Substack | `nota-cita` | La frase más fuerte del artículo y por qué la escribiste |
| Substack | `nota-teaser` | El gancho y el enlace al artículo. La única pieza que lleva enlace |
| X | `x-corto` | Una idea sola, 280 caracteres. **Gratis.** |
| X | `x-largo` | El argumento entero en un post largo, párrafos de una o dos líneas |
| X | `x-cita` | La frase rotunda sola, sin contexto ni explicación |
| LinkedIn | `in-gancho` | Dos líneas antes del «ver más», y detrás la historia. **Gratis.** |
| LinkedIn | `in-lista` | Un aprendizaje por línea |
| LinkedIn | `in-caso` | El resultado primero, el método después |

Reglas de contenido de los `hint`:

- El `hint` dice **cómo se escribe** el formato, no qué es. Es lo que lee el modelo.
- Para las notas, líneas cortas: en el móvil y en la bandeja se leen a ~55
  caracteres por línea (regla tomada de `HOOK-FORMULAS.md` de Cervantes).
- `nota-teaser` es la única que puede llevar el enlace al artículo. Las otras ocho
  se publican sin enlace: son piezas nativas, no anzuelos.
- Los ganchos de `in-gancho`, `x-corto` y `nota-pregunta` salen de las fórmulas de
  gancho de Cervantes, adaptadas — no copiadas literalmente.

Los `example` son **nuestros**, uno por formato, los nueve sobre el mismo tema
ajeno (correr un 10K, como en `types.ts`), para que se lean como «el mismo artículo,
nueve piezas» y queden lejos del tema de cualquier usuario. Cada `example` se usa
dos veces: como ancla de forma en el prompt y en la tarjeta bloqueada de la página.

## Flujo

### Paso 1 — gratis (`step: 'extract'`)

Límite: `overLimit('toolPreview', ip)`.

1. `scrape(url)` → `{ title, description, text, finalUrl }`.
2. Una llamada a `askJson` que devuelve, de una pasada:
   - `article`: `{ tema, tesis, publico, frase, prueba }`
   - `pieces`: las tres gratis (`nota-pregunta`, `x-corto`, `in-gancho`), ninguna de
     las cuales usa cita literal
   - `confidence`: `alta` | `baja`
3. Se verifica `article.frase` contra el texto raspado (ver "Honestidad").
4. Al navegador: `article`, las tres piezas, `confidence`, `finalUrl`.

`maxOutputTokens`: 3.500.

Errores de raspado, con mensaje propio cada uno: `blocked`, `not_found`, `timeout`,
`empty`, `invalid_url` — los que ya lanza `UnreadableError`.

### Paso 2 — el correo (`step: 'unlock'`)

Límites: `overLimit('toolDelivery', email)` y `overLimit('toolDeliveryPerIp', ip)`.
Correo desechable fuera con `isDisposable`.

1. `subscribe(email)` **primero**: si el modelo falla después, el lead ya está dentro.
2. Una llamada con los seis formatos restantes **y** el bloque de orden.
3. Correo con las nueve agrupadas por canal y el orden al final.

`maxOutputTokens`: 5.000.

El navegador manda de vuelta `article` y las tres piezas gratis (`free`), igual que
`10-post-types` manda `topic` y `free`: el servidor no guarda estado entre pasos.
`article` se relee con un `readArticle` que recorta cada campo, como `readTopic`.

Las seis piezas de pago **no se enseñan nunca en pantalla**. El correo es el único
sitio donde están, y por eso el email vale algo.

## Honestidad

Dos candados, los dos ya probados en el repo:

1. **La frase tiene que ser literal.** `nota-cita` y `x-cita` se apoyan en una frase
   del artículo. El modelo la devuelve en `article.frase` en el paso 1, y el servidor
   la comprueba ahí mismo contra el texto que le dio, con `verifyQuote` de
   `src/lib/tools/newsletter/rules.ts`. Si no aparece, **no se aborta**: se vacía
   `frase`, y en el paso 2 esas dos piezas se escriben parafraseando y sin comillas.
   Las dos están detrás del muro justamente para que la comprobación pase antes de
   escribirlas. Una cita inventada en boca de quien escribió el artículo es el peor
   fallo posible de esta herramienta.
2. **Las cifras no se inventan.** Misma regla que `10-post-types`: lo que no esté en
   el artículo se queda como hueco entre corchetes, y el correo explica que el hueco
   es a propósito.

## Ficheros

Nuevos:

- `src/lib/tools/repurpose/formats.ts` — los nueve formatos, `CHANNELS`,
  `freeFormats`, `gatedFormats`, `findFormat`.
- `src/lib/tools/repurpose/prompt.ts` — `ROLE`, `extractPrompt()`, `writePrompt(ids)`,
  `articleMessage(article)`. Importa `STYLE` de `$lib/tools/voice`.
- `src/lib/tools/repurpose/format.ts` — `sanitizePieces`, `readOrder`, `toPlainText`,
  `toMarkdown` (agrupado por canal, con el orden al final), `escapeMarkdown`.
- `src/routes/tool/repurpose/+page.svelte`
- `src/routes/tool/repurpose/+server.ts`
- `src/lib/content/tool-repurpose.md` — todo el copy, incluidos los errores.
- `src/lib/emails/tool-repurpose.md` — con el marcador `{{PIECES}}`. Nombre no
  numérico, así que `emails.ts` lo deja fuera de la secuencia.

Tocados:

- `src/lib/tools/list.ts` — una entrada más, `capturesEmail: true`.
- `src/lib/server/resend.ts` — función de envío para esta herramienta.

### Arreglo de paso en `resend.ts`

`sendToolCopyEmail`, `sendToolPostsEmail` y `sendNewsletterReportEmail` son la misma
función tres veces: cambian la plantilla y el nombre del marcador, y nada más. Antes
de escribir la cuarta copia se extrae:

```ts
async function sendToolEmail(template: string, marker: string, to: string, markdown: string)
```

Las tres existentes pasan a una línea cada una y la nueva es otra línea. No cambia
nada de lo que sale por el cable: mismos asuntos, mismas cabeceras
`List-Unsubscribe`, mismo `renderStandalone`.

## Pantalla

Estado inicial: la introducción de `tool-repurpose.md`, el campo de URL con
`InlineForm` (una URL cabe en una línea; el `TextareaForm` es para texto) y el
crédito debajo.

Con resultado: las tres tarjetas gratis primero, en orden Substack → X → LinkedIn,
cada una con su botón de copiar. Justo detrás, el muro con el campo de correo — no
al final, que queda debajo de seis tarjetas vacías y nadie baja tanto. Detrás del
muro, las seis bloqueadas, cada una con su nombre, su `bestFor` y su `example` de
otro tema.

Si `confidence` es `baja`, un aviso encima: el artículo dio poco y se ha supuesto.

Nada de tamaños de letra nuevos: `box`, `box-locked`, `box-title`, `body-text`,
`muted`, `eyebrow`, los que ya están en `app.css`.

## Créditos

Al pie de la página, como el de Neal O'Grady en las otras dos, y dejando claro que
son referencia y no método:

- **Vilma Núñez** — *Cómo crear mucho contenido partiendo de una idea*: el artículo
  como contenido base que se divide y se multiplica por canal.
- **Natalia Papiol** — su serie sobre notas de Substack: la mecánica de la nota
  corta en español.

Las fórmulas de gancho salen de `HOOK-FORMULAS.md` del motor de Cervantes, que es
material propio: se adapta, no se cita.

## Fuera de alcance, y por qué

- **Calendario con días concretos.** Envejece mal, se inventa y es la parte que más
  huele a plantilla. Queda el bloque de orden.
- **Modo manual pegando el artículo.** La entrada es URL. Si aparece la necesidad
  (Substack de pago, borradores), se añade después.
- **Publicar o programar.** La skill `post-bridge` haría esto, pero es otra
  herramienta: esta escribe y calla.
- **Guardar en qué canal publica el lead.** No hay dónde guardarlo hoy: el alta en
  Resend es una dirección y nada más.
- **Puntuación o nota del artículo.** Ya se sabe cómo acaba eso: ver `tally` en
  `newsletter/rules.ts`.

## Cómo se sabe que está hecho

1. `pnpm check` no añade errores nuevos a los 2 conocidos (`demo/paraglide` y
   `places-evaluator`).
2. **Se corre la herramienta de verdad**, con `pnpm dev`, contra tres artículos
   reales: uno de Substack, uno de un blog propio y uno que falle el raspado. El
   tipado pasa igual con un 400 de OpenAI: los fallos de la Responses API solo se
   ven corriéndola.
3. Llega el correo con las nueve piezas agrupadas y el orden, y ninguna línea sale
   convertida en encabezado o viñeta (el `escapeMarkdown` hace su trabajo).
4. Una cita inventada a mano en la respuesta del modelo se cae en `verifyQuote` y
   las dos piezas de cita se escriben sin comillas, sin romper nada.
5. Las seis de pago no aparecen en el HTML de la página en ningún momento.
