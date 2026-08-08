# Distribuye tu artículo — nueve átomos, no nueve tesis

## El problema, medido

`/tool/repurpose` corrido contra un artículo real (`sotoplatero.substack.com/p/de-donde-salen-los-leads-que-todos`,
8 de agosto de 2026) extrajo este material:

- el 46% de las búsquedas en Google son locales
- Outscraper cobra ~3 $ por 1.000 negocios
- 5 $ de crédito en Apify, 6 búsquedas, 2 países, 65 negocios por 0,45 $
- Miami: 25 plomeros, el 36% sin web
- Madrid: Mesón El Molinero, 917 reseñas, 4,7 estrellas, cero web
- peluquerías de Madrid: mediana de 225 reseñas, sin web
- escena: pedirle leads a Claude y recibir una lista inventada con aplomo

Y escribió estas tres notas:

> «Los leads que te venden caro suelen salir de una lista cruda que cuesta centavos. Lo que se cobra
> no es el dato: es la pereza de cualificarlo.»
> «Pensabas que más competencia venía con el mercado global. En local pasa lo contrario…»
> «Antes de venderle una web a un negocio sin página, mira sus reseñas.»

**Ni un número, ni un nombre, ni una escena.** La extracción es excelente y la escritura la ignora.

Dos causas, las dos en el diseño y ninguna en el modelo:

1. El prompt pide «la tesis», «una implicación», «una acción» — sustantivos generales — y **nunca obliga
   a que la nota cargue una prueba concreta**.
2. Las nueve funciones (idea central, contradicción, consecuencia, lección práctica…) son **nueve
   maneras de inclinar la misma tesis**. Por eso nueve notas se leen como nueve paráfrasis.

Hay una tercera, distinta: el prompt dice «No inventes nada» y «solo si se sostienen en el texto». Esa
regla hace imposible un ángulo no tratado, que por definición está fuera del texto.

## Lo que dice quien se dedica a esto

- **Zero-click content** (Amanda Natividad y Rand Fishkin, SparkToro): una pieza distribuida vale por
  sí sola y el clic es *aditivo, no obligatorio*. Las plataformas penalizan en alcance los posts con
  enlace; Meta declaró que el 97,3% de los posts de Facebook que consiguen vistas no llevan enlace
  externo. **El tool actual hace lo contrario**: obliga a la URL en dos notas como mínimo, tiene un
  formato entero (`puerta-articulo`) para mandar a la gente fuera, y el servidor inyecta el enlace a
  la fuerza (`ensureSourceLinks`) cuando el modelo no obedece.
- **Ross Simmonds**: repurposing no es reformatear. Lo eficaz exige transformación — ángulos frescos,
  no reproducción. Lo perezoso es copiar entre canales.
- **Atomic essay** (Dickie Bush y Nicolas Cole, Ship 30 for 30): una idea por pieza, y *«parte el tema
  en treinta componentes atómicos y escribe uno cada día»*. La unidad de una pieza corta es **un átomo
  del tema**, no la tesis vista de lado.
- **Second-day story** (periodismo): se vuelve a escribir sobre lo mismo avanzando con un desarrollo
  nuevo, otra dimensión o una consecuencia. Nunca refritando.
- **Notes de Substack**: el algoritmo pesa comentarios y restacks por encima de likes. Se toma la
  mecánica y **se rechaza el registro** de sus playbooks («3 formas de crecer 👇», dale like a tu propia
  nota), que es el slop que `voice.ts` prohíbe.
- **En casa**: `HOOK-FORMULAS.md` del repo de Cervantes — 75 fórmulas de ángulo de Oscar Feito — avisa
  arriba de que *no son plantillas sino puntos de partida de ángulo*, y su método empieza por **nombrar
  la tensión**. Ese paso es el que falta aquí.

## El repertorio nuevo

Nueve componentes distintos. Cada uno **anclado a un material que ningún otro puede usar**.

### Del artículo — las cinco gratuitas

Cada una obliga a llevar su prueba dentro del texto.

| id | Qué es |
|---|---|
| `cifra` | Un número del artículo y lo que significa. |
| `escena` | Un momento concreto, contado como pasó. |
| `caso` | Un ejemplo con nombre propio. |
| `leccion` | Una acción, pegada a la prueba que la justifica. |
| `cita` | La frase literal verificada, con la observación que la hace circular. |

### Más allá del artículo — las cuatro del correo

Aquí el modelo piensa. Cada una se ancla a una **tensión** distinta del análisis.

| id | Qué es |
|---|---|
| `consecuencia` | Si esto es verdad, entonces pasa esto otro. Algo que el artículo implica y no escribe. |
| `objecion` | La objeción más fuerte que el artículo no responde. La nombra y la contesta, o la deja abierta con honradez. |
| `limite` | Para quién NO vale esto. Dónde deja de aplicar la tesis. |
| `pregunta` | La tensión que queda abierta, como pregunta de verdad. |

**El muro cae en la costura entre las dos familias.** Gratis, el artículo recortado; en el correo, lo
que el artículo abre y no cierra. El argumento del muro deja de ser «has visto una de nueve» y pasa a
ser una frase que se sostiene sola.

`puerta-articulo` desaparece. Su trabajo lo hacen mejor `cifra` y `escena`.

`idea-central`, `detalle-revelador`, `contradiccion` e `historia` desaparecen como tales: la primera es
la tesis en abstracto (el fallo, no el formato) y las otras tres quedan absorbidas por `caso`, `escena`
y `cifra`, que piden lo mismo pero con un ancla obligatoria.

## Lo que impide que vuelva a salir genérico

No es apretar el prompt. Es verificación en el servidor, la misma disciplina que mantiene honesta la
cita del tool de newsletter.

Cada nota devuelve `{ id, text, ancla }`. `ancla` es el material exacto del análisis sobre el que está
construida, copiado de él.

1. **Anclas distintas, comparadas DENTRO de su ranura.** Dos notas sobre el mismo átomo es una
   entrega inválida y se regenera. Comparar las nueve contra las nueve se probó y tumbó un
   conjunto bueno: la nota de la cita se apoyaba en «La lista cruda cuesta centavos» y una de las
   tensiones repetía esa frase. Átomos distintos, palabras iguales. La repetición que importa es
   dentro de una ranura: dos notas peleándose una prueba, o dos de las cuatro tensiones siendo una.
2. **Solo dos exigencias mecánicas, y en los dos sitios donde son nítidas**: `cifra` tiene que
   contener un número del artículo y `caso` un nombre propio del artículo. Nada más.

   La primera versión exigía a las cinco notas de la familia «artículo» llevar dentro una marca de
   su ancla. **Se probó y se quitó**: chocaba de frente con la regla 5 —copia el material lo
   bastante literal para aprobar y no has puesto nada tuyo; reescríbelo con tus palabras y la marca
   desaparece— y como el modelo no puede ver la regla, las tiradas sobre el mismo artículo iban
   alternando entre los dos fallos. Lo que no se puede medir vive en el `hint`.
3. **El ancla existe.** Tiene que aparecer en el material del análisis, no inventarse.

Las comprobaciones 2 y 3 corren sobre la misma noción de «comparten una marca»: una cifra, un
nombre propio o cuatro palabras seguidas. **Exigir copia literal se probó primero y estaba mal**:
el modelo condensa, así que «…salieron 65 negocios reales por 0.45» vuelve como «65 negocios por
0,45 dólares», que es el mismo hecho y no es substring de nada.

El paso gratuito necesita **7000 tokens de salida**, no los 3500 de antes: el análisis creció con
`tensiones` y las notas pasaron de tres sin ancla a cinco con ella. A 3500 la respuesta se cortaba
a mitad del JSON y se leía como conjunto inválido.
4. **Vigilar la salida, no solo la entrada.** Dos notas no pueden decir lo mismo (comparado sobre el
   texto, sin lógica de ranuras) y ninguna puede ser su propia ancla copiada: tiene que aportar al
   menos seis palabras que el material no traía. Sin esto, la forma más barata de aprobar las reglas
   de ancla es devolver el material tal cual — y eso fue exactamente lo que pasó: `leccion` y `cita`
   volvieron idénticas byte a byte.

5. **Las cuatro del correo van marcadas como interpretación**, con su tensión nombrada. Publicar la
   inferencia de un modelo con tu nombre encima sin saber que es una inferencia es el fallo que hay
   que evitar; el correo lo dice en su encabezado de sección.

La regla de siempre no cambia: ni cifras, ni fechas, ni casos, ni citas inventadas. Lo que se abre no
es la puerta a inventar datos, es la puerta a **razonar** sobre los datos que hay.

## El enlace deja de ser obligatorio

Fuera la regla de «la URL en dos notas como mínimo» y fuera `ensureSourceLinks`. Sigue vigente
`pieceUsesOnlySourceUrl`: una URL ajena es un error. El modelo decide por nota si el enlace ayuda.

El correo gana una línea de criterio: el clic es aditivo, con una nota enlazada basta, y esa nota tiene
que sostenerse sin el enlace.

## El análisis gana `tensiones`

Hoy saca `ideas`, `pruebas`, `escenas`, `frase` — material — y ninguna tensión. `tensiones: string[]`
recoge lo que el artículo plantea y no cierra. Las cuatro notas de la segunda familia se anclan cada
una a una tensión distinta. Sin ese campo, «más allá del artículo» es una invitación a divagar.

## Piezas

| Fichero | Cambio |
|---|---|
| `src/lib/tools/repurpose/formats.ts` | El repertorio nuevo, las dos familias, `FREE_IDS` de cinco. |
| `src/lib/tools/repurpose/prompt.ts` | `tensiones` en el análisis, `ancla` en cada nota, la obligación de prueba concreta, fuera el mandato de URL. |
| `src/lib/tools/repurpose/format.ts` | `anclasDistintas()` y `llevaSuAncla()`; fuera `ensureSourceLinks`. |
| `src/lib/tools/repurpose/format.test.ts` | Tests de las dos funciones nuevas. |
| `src/routes/tool/repurpose/+server.ts` | El reparto 5/4, las comprobaciones nuevas, fuera la inyección de enlaces. |
| `src/routes/tool/repurpose/+page.svelte` | Cinco notas gratis, el muro con su texto nuevo. |
| `src/lib/tools/repurpose/copy.ts` o el `t` de la página | El copy del muro. |
| `src/lib/emails/tool-repurpose.md` | La sección marcada como interpretación y la línea del enlace. |
| `src/lib/tools/repurpose/manual-prompt.ts` | Al día con el repertorio nuevo. |
| `CLAUDE.md` | Corregir la descripción, que todavía dice «tres notas de Substack, tres de X y tres de LinkedIn». |

## Lo que no se toca

La voz, el muro de correo como mecanismo, la caché, los límites, el adjunto `.txt` y las dos llamadas
al modelo.

## Verificación

- `pnpm test` — los tests de `format.ts`, con los dos nuevos.
- `pnpm check` — la referencia es 1 error conocido en `places-evaluator`.
- `pnpm build`.
- **Correr el tool contra el mismo artículo de los leads** y comprobar a ojo lo único que importa: que
  las cinco notas gratuitas llevan encima un número, un nombre o una escena, y que las cuatro del
  correo dicen algo que el artículo no dice.
