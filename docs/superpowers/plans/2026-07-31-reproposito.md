# Repropósito — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir `/tool/repurpose` («Repropósito»): pegas la URL de un artículo y te lo devuelve repartido en nueve piezas para redes — tres gratis en pantalla (una por canal) y seis por correo, con un bloque de orden.

**Architecture:** Misma forma que las otras dos herramientas del sitio: dos pasos contra un único `+server.ts`. El paso 1 raspa la página con `scrape()`, y en **una** llamada al modelo saca el núcleo del artículo y escribe las tres piezas gratis. El paso 2, tras dejar el correo, escribe las seis restantes y el bloque de orden, y lo manda todo por Resend. Los nueve formatos son datos en `formats.ts`; el prompt se construye a partir de esa lista.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript estricto, Tailwind 4 + DaisyUI sobre el tema de `src/app.css`, `marked` para el markdown del copy, OpenAI `POST /v1/responses` vía `$lib/server/openai.ts`, Resend.

**Spec:** `docs/superpowers/specs/2026-07-31-reproposito-design.md`

## Global Constraints

- **El modelo es `gpt-5.4-mini` y no se cambia.** Lo eligió Damian tras comparar ocho.
- **Todas las llamadas al modelo pasan por `askJson` de `$lib/server/openai.ts`.** Ni un `fetch` suelto en un endpoint.
- **Todo paso que gasta dinero o manda correo pasa por `overLimit()`** de `$lib/server/rate-limit.ts`: el paso gratis por IP (`toolPreview`), el caro por correo (`toolDelivery`) con techo por IP (`toolDeliveryPerIp`).
- **Nada de copy en los `.svelte`.** Todo el texto vive en `src/lib/content/tool-repurpose.md` y se lee con `parseCopy`.
- **Solo hay dos tamaños de letra en el sitio**: cuerpo `1.25rem` y nota `0.875rem`. Escribir `text-base` o `text-lg` en el markup significa que falta una clase en `app.css`. Se usan las clases que ya existen: `.section`, `.box`, `.box-locked`, `.box-title`, `.box-text`, `.body-text`, `.muted`, `.eyebrow`, `.link-quiet`.
- **Las seis piezas de pago no llegan nunca al navegador.** No se generan hasta que entra el correo, y solo van al correo.
- **Comentarios y copy en español.** Los comentarios explican *por qué*, no *qué*.
- **`pnpm check` arrastra 2 errores conocidos** (`src/routes/demo/paraglide` y `src/routes/tool/places-evaluator`). Limpio significa «sin errores *nuevos*», no cero.
- **La salida del modelo se escapa antes de entrar en el markdown del correo.** Una línea que empiece por `#` o `-` se renderiza como encabezado o lista en el cliente de correo.
- **Las cifras no se inventan.** Lo que no esté en el artículo se queda como hueco entre corchetes.

---

### Task 1: Dos módulos compartidos — el candado de las citas y el escape de markdown

Dos de las nueve piezas (`nota-cita`, `x-cita`) se apoyan en una frase literal del artículo, y hay que comprobar que esa frase existe de verdad. Ese candado ya está escrito y probado dentro de `newsletter/rules.ts`, pero con una trampa: **`verifyQuote` normaliza solo la aguja, no el pajar** — quien llama tiene que normalizar el pajar antes, y la función que lo hace es privada del módulo. Llamarlo con el texto crudo del artículo rechazaría citas correctas.

Se saca a `src/lib/tools/quotes.ts`, al lado de `voice.ts`, que es el precedente de «texto y reglas que comparten las herramientas». Duplicar la normalización en `repurpose` sería pedir que las dos copias dejen de coincidir con el tiempo.

Y de paso el mismo problema con otra función: `escapeMarkdown` está copiada en `7-frameworks/format.ts` y en `10-post-types/format.ts`, y `repurpose` sería la tercera. **Decisión de Damian: sale también a un módulo compartido.** Las dos copias de hoy son idénticas en lógica —la de `7-frameworks` lleva comentarios en cada rama y la otra no—, así que unificarlas no cambia comportamiento. Los comentarios que se quedan son los buenos, los de `7-frameworks`.

**Files:**
- Create: `src/lib/tools/quotes.ts`
- Create: `src/lib/tools/markdown.ts`
- Modify: `src/lib/tools/newsletter/rules.ts` (borrar `QUOTE_MIN`, `normalize` y `verifyQuote`; importarlos del módulo nuevo)
- Modify: `src/lib/tools/7-frameworks/format.ts` (borrar `escapeMarkdown`; importarla)
- Modify: `src/lib/tools/10-post-types/format.ts` (borrar `escapeMarkdown`; importarla)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `QUOTE_MIN: number`
  - `normalizeQuoteText(text: string): string`
  - `unwrapQuotes(text: string): string`
  - `verifyQuote(cita: string, haystack: string): boolean` — `haystack` tiene que venir ya pasado por `normalizeQuoteText`.
  - `escapeMarkdown(text: string): string` (en `markdown.ts`)

- [ ] **Step 1: Comprobar qué caracteres normaliza hoy `rules.ts`**

El `replace` original lleva una clase de caracteres con comillas curvas y guiones largos —caracteres que se pierden o se cambian al teclearlos y al pasar por una terminal—. Antes de moverlo, se leen sus puntos de código del fichero, que es la única fuente fiable:

```bash
node -e "
const src = require('fs').readFileSync('src/lib/tools/newsletter/rules.ts', 'utf8');
for (const line of src.split('\n')) {
  if (!line.includes('.replace(/[')) continue;
  const clase = line.slice(line.indexOf('[') + 1, line.indexOf(']'));
  console.log([...clase].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')).join(' '), '  <-', line.trim());
}
"
```

Esperado: tres líneas, la primera con `U+00AB U+00BB U+201C U+201D U+2018 U+2019` (« » “ ” ‘ ’), la segunda con `U+2013 U+2014` (– —) y la tercera con `U+2026` (…). **Si sale algún punto de código más, añádelo a la clase del paso siguiente**: dejarlo fuera cambiaría el comportamiento de `newsletter`.

- [ ] **Step 2: Crear `src/lib/tools/quotes.ts`**

Cada clase de caracteres lleva encima un comentario que dice qué contiene, para que se pueda revisar de un vistazo sin fiarse de la fuente del editor. Los puntos de código tienen que ser los que salieron en el paso 1.

```ts
/**
 * El candado de las citas, compartido por las herramientas.
 *
 * Vivía dentro de `newsletter/rules.ts`, que es donde se ganó: allí todo hallazgo
 * abierto del modelo trae una cita literal y se comprueba contra el material antes
 * de aceptarlo, y eso ya pilló una síntesis del modelo presentada como evidencia.
 * `repurpose` necesita lo mismo —dos de sus nueve piezas se apoyan en una frase del
 * artículo—, y duplicar la normalización sería pedir que las dos copias dejen de
 * coincidir con el tiempo.
 *
 * Está aquí y no en `$lib/server` porque no toca red ni secretos: es una comparación
 * de cadenas, igual que `voice.ts` es texto compartido.
 */

/** Mínimo de caracteres de una cita. Menos que esto no prueba nada: "España" no es evidencia. */
export const QUOTE_MIN = 15;

/**
 * Normaliza para comparar citas: minúsculas, espacios colapsados y fuera los
 * caracteres que un modelo cambia sin darse cuenta (comillas curvas, guiones
 * largos, puntos suspensivos). Sin esto, una cita correcta se rechazaría por haber
 * convertido `"` en `«`.
 *
 * EL PAJAR HAY QUE PASARLO POR AQUÍ ANTES DE `verifyQuote`: esa función solo
 * normaliza la aguja. Era una función privada de `rules.ts` y su único cliente la
 * llamaba bien; al salir a un módulo compartido, esto pasa a ser parte del contrato.
 *
 * Cada clase lleva encima un comentario con los caracteres que contiene: son comillas
 * curvas, guiones largos y puntos suspensivos, que en un editor se parecen demasiado
 * entre sí y a sus versiones rectas. Si tocas una clase, comprueba después con el
 * script del plan que los puntos de código siguen siendo los mismos.
 */
export function normalizeQuoteText(text: string): string {
	return text
		.toLowerCase()
		// « » “ ” ‘ ’  →  "
		.replace(/[«»“”‘’]/g, '"')
		// – —  →  -
		.replace(/[–—]/g, '-')
		// …  →  ...
		.replace(/…/g, '...')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Quita las comillas que envuelven una cita.
 *
 * Hace falta por cómo normaliza: `«` y `»` se convierten en `"`, así que una cita
 * que venga envuelta («así») se busca en el pajar CON las comillas dentro de la
 * aguja, y el artículo original no las tiene. Resultado: una cita correcta que se
 * rechaza. El prompt pide la frase sin comillas; esto es el cinturón.
 */
export function unwrapQuotes(text: string): string {
	return text.replace(/^[\s«»"'“”‘’]+/, '').replace(/[\s«»"'“”‘’]+$/, '');
}

/**
 * La cita tiene que existir en el material.
 *
 * Es una comparación de cadenas, barata y brutal. `haystack` tiene que venir ya
 * normalizado con `normalizeQuoteText`.
 */
export function verifyQuote(cita: string, haystack: string): boolean {
	const needle = normalizeQuoteText(cita);
	return needle.length >= QUOTE_MIN && haystack.includes(needle);
}
```

- [ ] **Step 3: Comprobar que el candado funciona, ejecutándolo**

El repo no tiene test runner. `quotes.ts` no importa nada, así que se puede correr con el pelador de tipos de Node (v22.13 lo trae):

```bash
node --experimental-strip-types --input-type=module -e "
import { verifyQuote, normalizeQuoteText, unwrapQuotes } from './src/lib/tools/quotes.ts';
const hay = normalizeQuoteText('El día de la carrera no se gana nada: se cobra lo que hiciste en enero.');
console.log('literal    ', verifyQuote('el día de la carrera no se gana nada', hay));
console.log('mayúsculas ', verifyQuote('El Día De La Carrera No Se Gana Nada', hay));
console.log('envuelta   ', verifyQuote(unwrapQuotes('«El día de la carrera no se gana nada»'), hay));
console.log('inventada  ', verifyQuote('esta frase no está en el artículo', hay));
console.log('corta      ', verifyQuote('en enero', hay));
"
```

Esperado, exactamente:

```
literal     true
mayúsculas  true
envuelta    true
inventada   false
corta       false
```

Si `envuelta` sale `false`, `unwrapQuotes` no está quitando el carácter que toca. Si `literal` sale `false`, el cuerpo de `normalizeQuoteText` se copió mal.

- [ ] **Step 4: Dejar `rules.ts` tirando del módulo nuevo**

En `src/lib/tools/newsletter/rules.ts`:

1. Borrar `const QUOTE_MIN`, `function normalize` y `export function verifyQuote`, **dejando en su sitio el bloque de comentario que explica el candado** (es la evidencia de por qué existe, y es de newsletter).
2. Añadir el import arriba, con el resto:

```ts
import { normalizeQuoteText, verifyQuote } from '$lib/tools/quotes';
```

3. Sustituir la única llamada interna a `normalize(` — está en `openFindings`, `const normalized = normalize(haystack);` — por `normalizeQuoteText(haystack)`.

- [ ] **Step 5: Verificar que no quedó ninguna llamada huérfana**

```bash
grep -rn "normalize(\|verifyQuote\|QUOTE_MIN" src/lib/tools/newsletter/ src/routes/tool/newsletter/
```

Esperado: solo el import y las llamadas a `normalizeQuoteText` / `verifyQuote`. Ninguna definición y ningún `normalize(` a secas.

- [ ] **Step 6: Comprobar tipos y commitear el candado**

```bash
pnpm check
git add src/lib/tools/quotes.ts src/lib/tools/newsletter/rules.ts
git commit -m "refactor(tools): el candado de las citas, a un modulo compartido"
```

Esperado: `pnpm check` con los 2 errores conocidos y ninguno más.

- [ ] **Step 7: Comprobar que las dos copias de `escapeMarkdown` son iguales**

Antes de unificarlas hay que saber que unificar no cambia nada. Están en `src/lib/tools/7-frameworks/format.ts` y en `src/lib/tools/10-post-types/format.ts`:

```bash
node -e "
const fs = require('fs');
const cuerpo = (ruta) => {
  const src = fs.readFileSync(ruta, 'utf8');
  const desde = src.indexOf('function escapeMarkdown');
  const hasta = src.indexOf('\n}', desde);
  return src.slice(desde, hasta).replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
};
const a = cuerpo('src/lib/tools/7-frameworks/format.ts');
const b = cuerpo('src/lib/tools/10-post-types/format.ts');
console.log('iguales:', a === b);
if (a !== b) { console.log('A:', a); console.log('B:', b); }
"
```

Esperado: `iguales: true`. **Si sale `false`, para y dilo en tu informe**: significa que una de las dos herramientas escapa distinto y unificarlas cambiaría uno de los dos correos. No elijas tú cuál gana.

- [ ] **Step 8: Crear `src/lib/tools/markdown.ts`**

Se lleva el comentario largo de la versión de `7-frameworks`, que es el que explica cada rama, y los comentarios de dentro:

```ts
/**
 * Lo que hay que hacerle al texto del modelo antes de meterlo en un correo.
 *
 * Compartido por las tres herramientas: estaba copiado en `7-frameworks/format.ts`
 * y en `10-post-types/format.ts`, y `repurpose` habría sido la tercera copia.
 */

/**
 * Neutraliza el markdown accidental del texto del modelo.
 *
 * El correo se compone metiendo estos textos dentro de una plantilla markdown. Si
 * una línea empieza por "#", ">" o "-", el cliente de correo la pinta como
 * encabezado, cita o lista: aparece en letra grande o con viñeta donde debería haber
 * una frase. Y una línea de "---" o "===" convierte la frase anterior en un titular.
 * Se escapan solo los caracteres al principio de línea, que es donde tienen ese
 * efecto.
 *
 * Importa en todas, y más donde el texto va en líneas separadas a propósito: la
 * lista de LinkedIn de `repurpose`, y los tipos Lista y Práctico de `10-post-types`.
 */
export function escapeMarkdown(text: string): string {
	return text
		.split('\n')
		.map((line) => {
			// Línea que es solo guiones o iguales: subraya la frase anterior y la
			// convierte en encabezado. Se rompe con un espacio de por medio.
			if (/^\s*(-{2,}|={2,}|_{3,})\s*$/.test(line)) return line.replace(/(.)/g, '$1 ').trimEnd();
			// "1." o "1)" abren una lista numerada. Se escapa el signo y no la cifra,
			// porque markdown solo deja escapar puntuación.
			if (/^\s*\d+[.)]/.test(line)) return line.replace(/^(\s*\d+)([.)])/, '$1\\$2');
			return line.replace(/^(\s*)([#>+\-*=|])/, '$1\\$2');
		})
		.join('\n');
}
```

- [ ] **Step 9: Comprobar las tres ramas, ejecutándolas**

`markdown.ts` no importa nada, así que corre suelto:

```bash
node --experimental-strip-types --input-type=module -e "
import { escapeMarkdown } from './src/lib/tools/markdown.ts';
const casos = ['- una vinieta', '# un encabezado', '> una cita', '1. una lista', '2) otra lista', '---', '===', 'una frase normal', '  # con sangria'];
for (const caso of casos) console.log(JSON.stringify(caso), '->', JSON.stringify(escapeMarkdown(caso)));
"
```

Esperado, exactamente:

```
"- una vinieta" -> "\\- una vinieta"
"# un encabezado" -> "\\# un encabezado"
"> una cita" -> "\\> una cita"
"1. una lista" -> "1\\. una lista"
"2) otra lista" -> "2\\) otra lista"
"---" -> "- - -"
"===" -> "= = ="
"una frase normal" -> "una frase normal"
"  # con sangria" -> "  \\# con sangria"
```

Las tres ramas quedan cubiertas: la de subrayado (`---`, `===`), la de lista numerada (`1.`, `2)`) y la del resto de caracteres, con y sin sangría.

- [ ] **Step 10: Dejar las dos herramientas existentes tirando del módulo**

En `src/lib/tools/7-frameworks/format.ts` y en `src/lib/tools/10-post-types/format.ts`: borrar la función `escapeMarkdown` local **con su comentario** (ya está en el módulo compartido) y añadir el import arriba, junto al que ya hay:

```ts
import { escapeMarkdown } from '$lib/tools/markdown';
```

Las llamadas a `escapeMarkdown(...)` dentro de `toMarkdown` se quedan como están.

- [ ] **Step 11: Verificar que no quedó ninguna copia**

```bash
grep -rn "function escapeMarkdown" src/
grep -rn "escapeMarkdown" src/lib/tools/7-frameworks/format.ts src/lib/tools/10-post-types/format.ts
pnpm check
pnpm build
```

Esperado: `function escapeMarkdown` aparece **una sola vez**, en `src/lib/tools/markdown.ts`; los dos ficheros tienen su import y sus llamadas; `check` con los 2 errores conocidos y `build` limpio.

- [ ] **Step 12: Commit**

```bash
git add src/lib/tools/markdown.ts src/lib/tools/7-frameworks/format.ts src/lib/tools/10-post-types/format.ts
git commit -m "refactor(tools): el escape de markdown, a un modulo compartido"
```

---

### Task 2: Los nueve formatos

**Files:**
- Create: `src/lib/tools/repurpose/formats.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Channel = 'substack' | 'x' | 'linkedin'`
  - `type Format = { id: string; channel: Channel; name: string; bestFor: string; hint: string; example: string; maxChars?: number; needsQuote?: boolean; linksToArticle?: boolean }`
  - `CHANNELS: { id: Channel; name: string }[]`
  - `formats: Format[]` (nueve, en orden Substack → X → LinkedIn)
  - `freeFormats: Format[]` (tres, una por canal)
  - `gatedFormats: Format[]` (seis)
  - `findFormat(id: string): Format | undefined`
  - `byChannel(list: Format[]): { channel: Channel; name: string; items: Format[] }[]`

- [ ] **Step 1: Escribir el fichero completo**

```ts
/**
 * Los nueve formatos en los que se reparte un artículo.
 *
 * `id` es la clave que devuelve el modelo en su JSON. Si tocas un `id` aquí, el
 * prompt se entera solo: `prompt.ts` se construye a partir de esta lista.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AQUÍ NO HAY FUENTE QUE AUDITAR, Y ES A PROPÓSITO.
 *
 * `7-frameworks` y `10-post-types` sacan sus definiciones de un artículo concreto,
 * y ahí un `hint` no se toca sin volver a la fuente. Esta herramienta NO: los nueve
 * formatos son nuestros, para no quedar atados a un solo contenido. Al pie de la
 * página se citan dos referencias —Vilma Núñez y Natalia Papiol— como crédito de
 * lectura, no como esqueleto. Las fórmulas de gancho vienen del motor de Cervantes,
 * que es material propio: se adapta, no se cita.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * El `hint` dice CÓMO se escribe el formato, no qué es: es lo que lee el modelo.
 *
 * El `example` es nuestro, y los nueve van sobre EL MISMO tema ajeno (preparar un
 * primer 10K, igual que en `10-post-types/types.ts`) para que se lea como «el mismo
 * artículo, nueve piezas» y quede lejos del tema de cualquier usuario: lo que tiene
 * que copiar el modelo es la forma, no el asunto. Cada `example` se usa dos veces —
 * como ancla en el prompt y en la tarjeta bloqueada de la página.
 *
 * `needsQuote` marca las dos piezas que se apoyan en una frase literal del artículo.
 * Las dos están detrás del muro por un motivo técnico, no comercial: la frase se
 * verifica contra el artículo DESPUÉS de que el modelo responda, y en el paso gratis
 * la pieza y la frase salen de la misma llamada — la comprobación llegaría cuando la
 * cita ya está en pantalla. Detrás del muro se verifica antes de escribirlas.
 */

export type Channel = 'substack' | 'x' | 'linkedin';

/** El orden en que se agrupan los canales en la página y en el correo. */
export const CHANNELS: { id: Channel; name: string }[] = [
	{ id: 'substack', name: 'Notas de Substack' },
	{ id: 'x', name: 'Posts de X' },
	{ id: 'linkedin', name: 'Posts de LinkedIn' }
];

export type Format = {
	id: string;
	channel: Channel;
	/** Lo que se lee en la tarjeta. */
	name: string;
	/** Para qué sirve esta pieza, en una línea. Se enseña en pantalla y en el correo. */
	bestFor: string;
	/** Cómo se escribe. Esto es lo que lee el modelo. */
	hint: string;
	/** Nuestro, sobre otro tema. Se enseña en las tarjetas bloqueadas. */
	example: string;
	/** Tope de la plataforma, cuando lo hay de verdad. */
	maxChars?: number;
	/** Se apoya en una frase literal del artículo. */
	needsQuote?: boolean;
	/** Puede llevar el enlace al artículo. Solo el teaser. */
	linksToArticle?: boolean;
};

/** Las tres que se regalan: una por canal, y ninguna que dependa de una cita. */
const FREE_IDS = ['nota-pregunta', 'x-corto', 'in-gancho'];

export const formats: Format[] = [
	{
		id: 'nota-pregunta',
		channel: 'substack',
		name: 'Nota con pregunta',
		bestFor: 'Abrir conversación con quien ya te lee',
		hint: `Coge la duda que resuelve el artículo y devuélvesela al lector como pregunta abierta, sin resolverla. Dos o tres frases, cada una en su línea y corta, de las que se leen de un golpe en el móvil. Termina preguntando, no afirmando: esta nota vive de lo que contesten.`,
		example: `Llevo tres meses corriendo y sigo sin poder con cinco kilómetros seguidos.

Un amigo me dice que pare y camine treinta segundos cada kilómetro. Que así llego antes a los diez.

Me suena a trampa. ¿Vosotros paráis o aguantáis?`
	},
	{
		id: 'nota-cita',
		channel: 'substack',
		name: 'Nota con cita',
		bestFor: 'Enseñar el artículo por una rendija',
		needsQuote: true,
		hint: `Abre con la frase literal del artículo, sola en su línea y entre comillas. Debajo, dos o tres líneas de por qué la escribiste o de dónde salió. No resumas el artículo: esta nota enseña una frase, no un índice. Si no te han dado una frase literal, escribe la idea con tus palabras y sin comillas.`,
		example: `«El día de la carrera no se gana nada: se cobra lo que hiciste en enero.»

Escribí esa frase después de reventar mi primer 10K por salir a un ritmo que no era el mío.

Lo que se entrena no son las piernas. Es la paciencia.`
	},
	{
		id: 'nota-teaser',
		channel: 'substack',
		name: 'Nota que lleva al artículo',
		bestFor: 'Mandar tráfico al artículo entero',
		linksToArticle: true,
		hint: `Una línea que abra un hueco —lo que el lector todavía no sabe— y otra que diga qué se lleva si entra. Después el enlace, solo en su línea. Nada de «nuevo post», «os dejo por aquí» ni «link en los comentarios». Es la ÚNICA pieza de las nueve que lleva enlace.`,
		example: `Casi todo el que abandona su primer 10K lo deja en la semana cuatro. Y no es por las piernas.

He escrito qué pasa esa semana y qué hacer para que no te pase.

https://ejemplo.com/primer-10k`
	},
	{
		id: 'x-corto',
		channel: 'x',
		name: 'Post corto',
		bestFor: 'La idea que se entiende sin contexto',
		maxChars: 280,
		hint: `Una sola idea del artículo, la que se sostenga sin explicar nada antes. Tiene que caber en 280 caracteres contando espacios y saltos de línea. Sin hashtags, sin enlace y sin segunda parte: si necesita continuar, esta no es la pieza.`,
		example: `Nadie abandona su primer 10K por falta de piernas.

Lo dejan la semana en que entrenar ya no es novedad y todavía no es costumbre.

Esa semana no se corre. Se aguanta.`
	},
	{
		id: 'x-largo',
		channel: 'x',
		name: 'Post largo',
		bestFor: 'El argumento entero, de una vez',
		maxChars: 2500,
		hint: `El argumento del artículo completo, en un post que se lea de arriba abajo. Párrafos de una o dos líneas con una línea en blanco entre ellos. Abre con la afirmación más incómoda del artículo, desarrolla, y cierra con la frase que quieres que la gente repita. Sin numerar, sin enlace y sin anunciar que es un hilo: no lo es, es un post largo que se publica de una vez.`,
		example: `Te vas a apuntar a un 10K y vas a empezar corriendo más de lo que deberías.

Lo sé porque lo hice yo.

Semana uno: sales tres días y vuelves eufórico.

Semana dos: te duele algo y lo ignoras.

Semana cuatro: llueve, no te apetece, y descubres que la motivación se ha ido a otra parte.

Ahí se cae la gente. No en el kilómetro nueve de la carrera.

Lo que funciona es de un aburrimiento insultante: salir despacio, salir corto y salir aunque no toque ganas.

El día de la carrera no se gana nada. Se cobra.`
	},
	{
		id: 'x-cita',
		channel: 'x',
		name: 'La frase, sola',
		bestFor: 'Lo que se retuitea sin leer el resto',
		maxChars: 280,
		needsQuote: true,
		hint: `La frase literal del artículo, sola, sin comillas y sin nada detrás que la explique. Se publica desnuda: si necesita una línea de aclaración, elige otra frase. Si no te han dado una frase literal, escribe la afirmación más rotunda del artículo con tus palabras.`,
		example: `El día de la carrera no se gana nada: se cobra lo que hiciste en enero.`
	},
	{
		id: 'in-gancho',
		channel: 'linkedin',
		name: 'Gancho e historia',
		bestFor: 'Que alguien que no te sigue pulse «ver más»',
		hint: `Las dos primeras líneas son todo: LinkedIn corta ahí con el «ver más», así que ahí va la escena o la afirmación, nunca el contexto. Detrás, la historia en párrafos de una línea, en pasado y con lo que se sintió. Cierra con la frase que resume, sin pedir nada. Sin emojis, sin «¿te ha pasado?» y sin «spoiler:».`,
		example: `Mi primer 10K lo terminé andando.

Había entrenado cuatro meses.

Salí a un ritmo que no era el mío porque el de delante iba a ese, y en el kilómetro seis se me apagó la luz.

Los últimos cuatro los hice mirando el suelo y calculando cuánto quedaba.

Cuando cruzas así no piensas en el tiempo. Piensas en por qué no fuiste a lo tuyo.

Cuatro meses de trabajo tirados en los tres primeros minutos.

Nadie se lesiona por ir despacio.`
	},
	{
		id: 'in-lista',
		channel: 'linkedin',
		name: 'Lista de aprendizajes',
		bestFor: 'Lo que se guarda para después',
		hint: `Una línea de entrada que diga cuántas cosas vienen y de qué. Después un aprendizaje por línea, todos con la misma construcción para que se lean de un barrido, y el más incómodo el último. Nada de numerar con emojis, flechas ni viñetas: línea y punto.`,
		example: `Cinco cosas que aprendí preparando mi primer 10K, y ninguna tiene que ver con correr:

Que la primera semana no cuenta. La primera semana aguanta cualquiera.

Que el día que menos te apetece salir es el que más suma.

Que ir despacio no es entrenar menos, es entrenar sin romperte.

Que el plan que puedes cumplir vale más que el que te impresiona.

Y que si te comparas con el de al lado, sales a su ritmo y acabas andando.`
	},
	{
		id: 'in-caso',
		channel: 'linkedin',
		name: 'Caso con resultado',
		bestFor: 'Demostrar que funciona sin decir que funciona',
		hint: `El resultado primero, en la primera línea, con la cifra si el artículo la trae. Después qué se hizo, en tres o cuatro líneas. El método al final, nunca al principio. Si el artículo NO trae cifras, deja el hueco entre corchetes —«[tu tiempo]», «[X clientes]»— y no lo rellenes: la cifra es de quien escribió el artículo, no tuya.`,
		example: `De no llegar a cinco kilómetros a terminar un 10K en [tu tiempo], en cuatro meses.

Lo que hice: tres salidas por semana, ninguna larga al principio, y una regla — si no puedo hablar mientras corro, voy demasiado rápido.

Sin gimnasio, sin plan de pago y sin reloj caro.

El método, que es lo de menos: correr despacio la mayor parte del tiempo. Eso es todo.`
	}
];

/** Las tres de pantalla, en orden de canal. */
export const freeFormats: Format[] = formats.filter((format) => FREE_IDS.includes(format.id));

/** Las seis del correo. */
export const gatedFormats: Format[] = formats.filter((format) => !FREE_IDS.includes(format.id));

export function findFormat(id: string): Format | undefined {
	return formats.find((format) => format.id === id);
}

/**
 * Agrupa por canal, en el orden de `CHANNELS`, y se salta los canales sin piezas.
 * Lo usan la página y el correo, para que los dos agrupen igual.
 */
export function byChannel(list: Format[]): { channel: Channel; name: string; items: Format[] }[] {
	return CHANNELS.map(({ id, name }) => ({
		channel: id,
		name,
		items: list.filter((format) => format.channel === id)
	})).filter((group) => group.items.length > 0);
}
```

- [ ] **Step 2: Comprobar que la lista está bien repartida**

```bash
node --experimental-strip-types --input-type=module -e "
import { formats, freeFormats, gatedFormats, byChannel, CHANNELS } from './src/lib/tools/repurpose/formats.ts';
console.log('total     ', formats.length);
console.log('gratis    ', freeFormats.map(f => f.id).join(', '));
console.log('muro      ', gatedFormats.length);
console.log('un canal  ', new Set(freeFormats.map(f => f.channel)).size);
console.log('con cita  ', formats.filter(f => f.needsQuote).map(f => f.id).join(', '));
console.log('enlaces   ', formats.filter(f => f.linksToArticle).map(f => f.id).join(', '));
console.log('grupos    ', byChannel(formats).map(g => g.channel + ':' + g.items.length).join(' '));
console.log('ids únicos', new Set(formats.map(f => f.id)).size === formats.length);
"
```

Esperado, exactamente:

```
total      9
gratis     nota-pregunta, x-corto, in-gancho
muro       6
un canal   3
con cita   nota-cita, x-cita
enlaces    nota-teaser
grupos     substack:3 x:3 linkedin:3
ids únicos true
```

`un canal 3` es lo que confirma que las gratis son una por canal y no dos del mismo. Ninguna de las gratis aparece en `con cita`: eso es la decisión del spec, comprobada.

- [ ] **Step 3: Comprobar tipos y commitear**

```bash
pnpm check
git add src/lib/tools/repurpose/formats.ts
git commit -m "feat(tool/repurpose): los nueve formatos en los que se reparte un articulo"
```

---

### Task 3: Limpiar la respuesta del modelo y montar el markdown del correo

**Files:**
- Create: `src/lib/tools/repurpose/format.ts`

**Interfaces:**
- Consumes: `findFormat`, `byChannel`, `formats` de `./formats`; `escapeMarkdown` de `$lib/tools/markdown` (Task 1 — **no la vuelvas a escribir aquí**).
- Produces:
  - `type Piece = { id: string; text: string }`
  - `sanitizePieces(raw: unknown): Piece[]`
  - `readOrder(raw: unknown): string[]`
  - `toPlainText(piece: Piece): string`
  - `toMarkdown(pieces: Piece[], order: string[]): string`

- [ ] **Step 1: Escribir el fichero completo**

```ts
import { escapeMarkdown } from '$lib/tools/markdown';
import { byChannel, findFormat, formats } from './formats';

/** Una pieza ya escrita: el id de su formato y el texto entero. */
export type Piece = { id: string; text: string };

/**
 * Se queda solo con lo que reconocemos de la respuesta del modelo: piezas de un
 * formato que existe y con texto de verdad. Si el modelo se inventa un id o
 * devuelve un número donde iba el texto, aquí se cae.
 *
 * Se descartan también los ids repetidos: el modelo a veces escribe dos veces el
 * mismo formato y, sin esto, la página pintaría dos tarjetas iguales y el correo
 * llevaría la pieza dos veces.
 */
export function sanitizePieces(raw: unknown): Piece[] {
	const list = Array.isArray((raw as { pieces?: unknown })?.pieces)
		? ((raw as { pieces: unknown[] }).pieces as unknown[])
		: [];

	const pieces: Piece[] = [];
	const seen = new Set<string>();
	for (const entry of list) {
		if (!entry || typeof entry !== 'object') continue;
		const { id, text } = entry as { id?: unknown; text?: unknown };
		if (typeof id !== 'string' || typeof text !== 'string') continue;
		if (!findFormat(id) || !text.trim() || seen.has(id)) continue;
		seen.add(id);
		pieces.push({ id, text: text.trim() });
	}
	return pieces;
}

/**
 * El bloque de orden: en qué orden publicar las piezas y por qué.
 *
 * Devuelve líneas ya limpias, y un array vacío si el modelo no lo mandó. Vacío es
 * un valor válido —el correo se envía igual— pero quien llama lo anota en el log:
 * si un día desaparece siempre, hay que enterarse por ahí y no por un correo corto.
 *
 * El tope de ocho líneas es para que no se convierta en un segundo artículo.
 */
export function readOrder(raw: unknown): string[] {
	const list = Array.isArray((raw as { orden?: unknown })?.orden)
		? ((raw as { orden: unknown[] }).orden as unknown[])
		: [];

	return list
		.filter((line): line is string => typeof line === 'string')
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, 8);
}

/** La pieza como texto plano, que es lo que se copia al portapapeles. */
export function toPlainText(piece: Piece): string {
	return piece.text;
}

/**
 * Las piezas como markdown, para el correo de entrega.
 *
 * Un solo recorrido, agrupando por canal con `byChannel` —el mismo que usa la
 * página, para que las dos agrupen igual—. Se construye a partir de las piezas que
 * HAY: un formato que el modelo no devolvió simplemente no aparece, en vez de dejar
 * un hueco con título. Nada de tablas: la plantilla del correo no las estiliza y se
 * desbordan a 320 px.
 */
export function toMarkdown(pieces: Piece[], order: string[]): string {
	const byId = new Map(pieces.map((piece) => [piece.id, piece]));
	const written = formats.filter((format) => byId.has(format.id));

	const blocks: string[] = [];

	for (const group of byChannel(written)) {
		blocks.push(`## ${group.name}`);
		for (const format of group.items) {
			const piece = byId.get(format.id);
			if (!piece) continue;
			blocks.push(`### ${format.name}\n\n*${format.bestFor}*\n\n${escapeMarkdown(piece.text)}`);
		}
	}

	if (order.length) {
		blocks.push(`## En qué orden publicarlas`);
		blocks.push(order.map((line) => `- ${escapeMarkdown(line).replace(/^\\-\s*/, '')}`).join('\n'));
	}

	return blocks.join('\n\n');
}
```

- [ ] **Step 2: Ejecutarlo contra respuestas sucias**

`format.ts` importa `./formats` sin extensión y `$lib/tools/markdown` por alias, y el pelador de tipos de Node no resuelve ni una cosa ni la otra. Se comprueba con copias temporales en el scratchpad, con las rutas reescritas — **copias, no toques el fichero del repo para esto**. La ruta de `SCRATCH` de abajo es la del scratchpad de la sesión en que se escribió el plan: usa la de la tuya si es otra.

```bash
SCRATCH="C:/Users/soto/AppData/Local/Temp/claude/C--Users-soto-projects-damian/e9fa0b18-fca0-4398-a378-01c412dedac1/scratchpad"
mkdir -p "$SCRATCH"
cp src/lib/tools/repurpose/formats.ts "$SCRATCH/formats.ts"
cp src/lib/tools/markdown.ts "$SCRATCH/markdown.ts"
sed -e "s#from './formats'#from './formats.ts'#" -e "s#from '\$lib/tools/markdown'#from './markdown.ts'#" src/lib/tools/repurpose/format.ts > "$SCRATCH/format.ts"
node --experimental-strip-types --input-type=module -e "
import { sanitizePieces, readOrder, toMarkdown } from '$SCRATCH/format.ts';
const sucio = { pieces: [
  { id: 'x-corto', text: '  una idea suelta  ' },
  { id: 'x-corto', text: 'la misma otra vez' },
  { id: 'inventado', text: 'formato que no existe' },
  { id: 'in-lista', text: 42 },
  { id: 'nota-pregunta', text: '' },
  { id: 'in-gancho', text: '- linea que empieza por guion\n# y otra por almohadilla' }
]};
const pieces = sanitizePieces(sucio);
console.log('ids     ', pieces.map(p => p.id).join(', '));
console.log('recorta ', JSON.stringify(pieces[0].text));
console.log('orden   ', JSON.stringify(readOrder({ orden: ['  primero el teaser  ', '', 7, 'luego el resto'] })));
const md = toMarkdown(pieces, ['primero el teaser', 'luego el resto']);
console.log('escapa  ', md.includes('\\\\- linea') && md.includes('\\\\# y otra'));
console.log('canales ', md.match(/^## .*/gm).join(' | '));
"
```

Esperado, exactamente:

```
ids      x-corto, in-gancho
recorta  "una idea suelta"
orden    ["primero el teaser","luego el resto"]
escapa   true
canales  ## Posts de X | ## Posts de LinkedIn | ## En qué orden publicarlas
```

Lo que confirma cada línea: el id repetido y el inventado se caen, el texto que no es cadena se cae, el vacío se cae, los espacios se recortan, las líneas que empiezan por markdown se escapan, y los canales salen agrupados y en el orden de `CHANNELS` (Substack no aparece porque ninguna pieza válida era suya).

- [ ] **Step 3: Borrar los temporales, comprobar tipos y commitear**

```bash
rm "$SCRATCH/format.ts" "$SCRATCH/formats.ts" "$SCRATCH/markdown.ts"
pnpm check
git add src/lib/tools/repurpose/format.ts
git commit -m "feat(tool/repurpose): limpiar la respuesta del modelo y montar el markdown"
```

---

### Task 4: Los prompts

**Files:**
- Create: `src/lib/tools/repurpose/prompt.ts`

**Interfaces:**
- Consumes: `formats`, `freeFormats`, `findFormat`, `type Format` de `./formats`; `STYLE` de `$lib/tools/voice`.
- Produces:
  - `type Article = { tema: string; tesis: string; publico: string; frase: string; prueba: string }`
  - `extractPrompt(): string`
  - `writePrompt(ids: string[]): string`
  - `articleMessage(article: Article, sourceUrl: string): string`

- [ ] **Step 1: Escribir el fichero completo**

```ts
import { formats, freeFormats, type Format } from './formats';
import { STYLE } from '$lib/tools/voice';

/** El núcleo del artículo, sacado en el primer paso y reutilizado en el segundo. */
export type Article = {
	/** De qué va el artículo, en una frase. */
	tema: string;
	/** Lo que defiende: la afirmación que sostiene, no el resumen. */
	tesis: string;
	/** A quién le sirve y qué le duele o quiere. */
	publico: string;
	/**
	 * La frase más fuerte del artículo, LITERAL. Cadena vacía si no se pudo
	 * verificar contra el texto: el servidor la vacía y entonces las dos piezas de
	 * cita se escriben parafraseando.
	 */
	frase: string;
	/** Cifras, casos o fechas que estén EN el artículo. Vacío si no hay. */
	prueba: string;
};

function indent(text: string): string {
	return text
		.split('\n')
		.map((line) => `      ${line}`)
		.join('\n');
}

/**
 * La ficha de cada formato para el modelo: dónde se publica, para qué sirve, cómo se
 * escribe, el tope de caracteres si lo hay, y una muestra de la forma.
 *
 * La muestra es nuestra y va de otro tema (correr un 10K) a propósito, y se avisa de
 * que lo es: lo que tiene que copiar es el molde, no el asunto.
 */
function formatSpec(list: Format[]): string {
	return list
		.map((format) =>
			[
				`- id "${format.id}" — ${format.name} (${format.channel})`,
				`   Para qué: ${format.bestFor}`,
				`   Cómo: ${format.hint}`,
				format.maxChars ? `   Tope: ${format.maxChars} caracteres, contando espacios.` : '',
				`   Ejemplo de la forma (de OTRO tema, correr un 10K; enseña el molde, no lo copies):`,
				indent(format.example)
			]
				.filter(Boolean)
				.join('\n')
		)
		.join('\n\n');
}

const ROLE = `Eres quien reparte en redes lo que este negocio publica. Coges un artículo ya
escrito y lo conviertes en piezas nativas de cada red: notas de Substack, posts de X y posts de
LinkedIn. Escribes en corto y directo, como Isra Bravo: sin adornos, de tú a tú, sin emojis.
Cada pieza la va a publicar la persona con su nombre, así que tiene que sonar a ella y no a un
folleto de agencia.`;

const OUTPUT_SHAPE = `- Un objeto en "pieces" por cada id pedido, en el mismo orden.
- Cada "text" es la pieza entera, lista para copiar y pegar. Sin comillas alrededor, sin
  repetir el nombre del formato dentro, sin títulos tipo "Post de LinkedIn:".
- Puedes usar saltos de línea dentro de una pieza, y en varios formatos hacen falta. Ningún
  otro markdown: nada de negrita, viñetas ni almohadillas.
- Es el MISMO artículo en todas: lo que cambia es el formato y el ángulo desde el que se cuenta.
  No repitas las mismas frases de una pieza a otra.
- Solo la pieza con enlace lleva enlace. Las demás se publican sin URL.
- No te inventes ni una cifra, ni un cliente, ni una fecha. Lo que no esté en el artículo se
  queda como hueco entre corchetes: "[tu cifra]". El hueco es honesto; el dato inventado, no.
- Los ejemplos son de correr un 10K y están SOLO para que veas la forma. Escribe siempre sobre
  el artículo que te han dado, nunca sobre correr (salvo que el artículo vaya de correr).
- Solo el JSON, sin explicaciones ni bloques de código.`;

/**
 * Prompt del primer paso: lee el artículo raspado y, en la misma pasada, escribe las
 * tres piezas gratis (una por canal).
 *
 * Ninguna de las tres se apoya en cita literal, y eso es deliberado: la frase que
 * devuelve aquí se verifica DESPUÉS, así que una pieza gratis con comillas llevaría
 * una cita sin comprobar a la pantalla.
 */
export const extractPrompt = () => {
	const ids = freeFormats.map((format) => `"${format.id}"`).join(', ');

	return `${ROLE}

Recibes un artículo entero, tal como se ha podido leer de la web: puede traer restos de menú,
pie o cabecera. Ignora esa maquinaria y quédate con el texto del artículo.

Haces dos cosas de una vez:

1. Ordenar el artículo: de qué va, qué defiende, a quién le sirve, y cuál es su frase más
   fuerte, copiada LITERAL.
2. Escribir tres piezas, una por red: ${ids}.

${STYLE}

## LOS FORMATOS QUE ESCRIBES AHORA

${formatSpec(freeFormats)}

## FORMATO DE SALIDA

Devuelves SOLO un objeto JSON con esta forma exacta:

{
  "article": {
    "tema": "De qué va el artículo, en una frase",
    "tesis": "Lo que defiende: la afirmación que sostiene, no el resumen",
    "publico": "A quién le sirve y qué le duele o quiere, en una frase",
    "frase": "La frase más fuerte del artículo, COPIADA LITERAL del texto",
    "prueba": "Cifras, casos, nombres o fechas que estén EN el artículo. Cadena vacía si no hay."
  },
  "confidence": "alta" | "baja",
  "pieces": [ { "id": "<el id del formato>", "text": "<la pieza entera>" } ]
}

Sobre "article":
- "frase" se copia **carácter a carácter** del artículo: una frase entera, de las que se
  sostienen solas, de al menos quince caracteres. **Sin comillas alrededor.** No la mejores, no
  la acortes y no la juntes de dos trozos separados: se comprueba contra el texto del artículo y
  si no aparece tal cual, se tira. Si el artículo no tiene ninguna frase así, cadena vacía.
- En "prueba" solo va lo que esté en el artículo. Si no hay nada, cadena vacía.
- Pon "confidence": "baja" cuando lo que has recibido no parece un artículo: cuatro líneas, una
  página de índice, un muro de pago. Haz tu mejor trabajo de todas formas.

Sobre "pieces":
${OUTPUT_SHAPE}`;
};

/**
 * Prompt del segundo paso: el mismo artículo, con los formatos que quedan, más el
 * bloque de orden.
 *
 * `ids` son ids de `formats.ts`. El orden va en la misma llamada y no en otra: es
 * media docena de líneas y no merece una segunda factura.
 */
export const writePrompt = (ids: string[]) => {
	const selected = formats.filter((format) => ids.includes(format.id));

	return `${ROLE}

Recibes un artículo ya ordenado —de qué va, qué defiende, a quién le sirve— y escribes
${selected.length === 1 ? 'una pieza' : `${selected.length} piezas`} para redes a partir de él.
Es el mismo artículo cada vez: lo que cambia es el formato y el ángulo.

Escribes además el orden en que conviene publicarlas.

${STYLE}

## LOS FORMATOS

${formatSpec(selected)}

## FORMATO DE SALIDA

Devuelves SOLO un objeto JSON con esta forma exacta:

{
  "pieces": [
    { "id": "<el id del formato>", "text": "<la pieza entera>" }
  ],
  "orden": [
    "<una línea: qué pieza va primero y por qué>"
  ]
}

Sobre "pieces":
${OUTPUT_SHAPE}

Sobre "orden":
- Entre cuatro y seis líneas, en el orden real de publicación.
- Cada línea nombra el formato y dice por qué va ahí, en una frase. Ejemplo de la forma:
  "Primero el post corto de X: es el que más rápido dice si el tema interesa."
- **Sin días ni fechas.** Nada de "día 1", "el lunes" ni "a las 9:00": eso no lo sabes tú.
  Habla de antes y después, no de calendario.
- La pieza con enlace va pegada a la publicación del artículo, mientras sigue reciente.`;
};

/**
 * El mensaje de usuario del segundo paso: el artículo ordenado, formateado para el
 * modelo.
 *
 * `sourceUrl` es la única URL que puede aparecer en una pieza, y solo en la del
 * teaser. Si viene vacía, se le dice: mejor que escriba la pieza sin enlace que que
 * se invente uno.
 */
export function articleMessage(article: Article, sourceUrl: string): string {
	const frase = article.frase.trim()
	 	? `«${article.frase.trim()}» (verificada: aparece tal cual en el artículo, puedes citarla entre comillas)`
		: '(ninguna verificada — escribe esas piezas con tus palabras y SIN comillas)';

	const prueba = article.prueba.trim()
		? article.prueba.trim()
		: '(no hay ninguna prueba real disponible — usa huecos entre corchetes donde haga falta)';

	const enlace = sourceUrl.trim() ? sourceUrl.trim() : '(no disponible — escribe esa pieza sin enlace)';

	return `Artículo sobre el que escribir:

- De qué va: ${article.tema}
- Qué defiende: ${article.tesis}
- A quién le sirve: ${article.publico}
- Su frase más fuerte: ${frase}
- Pruebas reales disponibles: ${prueba}
- Enlace al artículo (solo para la pieza que lleva enlace): ${enlace}`;
}
```

- [ ] **Step 2: Comprobar que el prompt sale entero**

```bash
pnpm check
```

Esperado: los 2 errores conocidos y ninguno más. (El prompt de verdad se prueba corriendo la herramienta, en la Task 6: los fallos de la Responses API son 400s que el tipado no ve.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/tools/repurpose/prompt.ts
git commit -m "feat(tool/repurpose): los prompts de los dos pasos"
```

---

### Task 5: El correo, y una función de envío en vez de la cuarta copia

`sendToolCopyEmail`, `sendToolPostsEmail` y `sendNewsletterReportEmail` son la misma función tres veces: cambian la plantilla y el nombre del marcador, y nada más. Antes de escribir la cuarta copia se extrae el cuerpo común.

**Files:**
- Create: `src/lib/emails/tool-repurpose.md`
- Modify: `src/lib/server/resend.ts` (extraer `sendToolEmail`; las tres existentes pasan a una línea; añadir `sendToolPiecesEmail`)

**Interfaces:**
- Consumes: `toMarkdown` de `$lib/tools/repurpose/format` (lo llama el endpoint, no este módulo).
- Produces: `sendToolPiecesEmail(to: string, piecesMarkdown: string): Promise<void>`

- [ ] **Step 1: Escribir la plantilla del correo**

`src/lib/emails/tool-repurpose.md`. **El nombre no es numérico a propósito**: `emails.ts` solo mete en la secuencia los `NN.md`.

```markdown
---
# Correo de entrega del tool /tool/repurpose. NO forma parte de la secuencia diaria:
# el nombre del fichero no es numérico, así que emails.ts lo deja fuera.
# El marcador PIECES del cuerpo se sustituye por las nueve piezas ya agrupadas por
# canal, con el bloque de orden al final. No escribas ese marcador entre llaves aquí
# arriba: solo se sustituye en el cuerpo, pero mejor no tentar a la suerte.
subject: Tu artículo, repartido en nueve piezas
---

Aquí tienes tu artículo repartido. Las nueve, para que no dependas de tener la pestaña abierta.

{{PIECES}}

---

**Cómo se usan**

No las publiques todas el mismo día. Las tienes para tres semanas, y ese es el punto: el artículo ya estaba escrito.

Cambia dos frases de cada una para que suene a ti. Se nota cuando algo se ha publicado sin releerlo.

Donde veas algo **entre corchetes**, es un hueco. Lo he dejado a propósito: son tus cifras, y esas no me las invento yo.

Y solo una de las nueve lleva enlace. Las demás van sin él porque una pieza que manda fuera se reparte peor: la red no la mueve igual.

---

Esto era la parte fácil. Lo difícil es tener algo que repartir cada semana.

Eso se llama Objeto Brillante: un email a la semana con algo que he hecho con IA y que funciona. Sin cursos y sin que toques una tecla.

Si te canso, te borras abajo en un clic.

**Damian**
```

- [ ] **Step 2: Extraer el cuerpo común en `resend.ts`**

Añadir el import de la plantilla nueva detrás de los tres que ya hay (líneas 6-8 de `src/lib/server/resend.ts`):

```ts
import toolRepurposeTemplate from '../emails/tool-repurpose.md?raw';
```

Y sustituir las tres funciones de envío por esto:

```ts
/**
 * El cuerpo común de los correos de las herramientas.
 *
 * Las tres —copy, posts, informe— eran la misma función con otra plantilla y otro
 * marcador, así que cualquier arreglo (una cabecera, el `from`) había que hacerlo
 * tres veces, y la cuarta herramienta habría hecho cuatro.
 *
 * `renderStandalone` sustituye el marcador SOLO en el cuerpo, después de parsear el
 * frontmatter: hacerlo antes inyectaba contenido en el frontmatter y mandaba correos
 * sin asunto. No lo deshagas.
 */
async function sendToolEmail(
	template: string,
	marker: string,
	to: string,
	markdown: string
): Promise<void> {
	const from = env.RESEND_FROM;
	if (!from) throw new Error('RESEND_FROM no configurada');
	const url = unsubscribeUrl(to);
	const rendered = renderStandalone(template, url, { [marker]: markdown });

	const { error } = await client().emails.send({
		from,
		to,
		subject: rendered.subject,
		html: rendered.html,
		headers: {
			'List-Unsubscribe': `<${url}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
		}
	});
	if (error) throw new Error(error.message);
}

/** Los siete frameworks de /tool/7-frameworks. */
export async function sendToolCopyEmail(to: string, copiesMarkdown: string): Promise<void> {
	await sendToolEmail(toolCopyTemplate, 'COPIES', to, copiesMarkdown);
}

/** Los diez posts de /tool/10-post-types. */
export async function sendToolPostsEmail(to: string, postsMarkdown: string): Promise<void> {
	await sendToolEmail(toolPostsTemplate, 'POSTS', to, postsMarkdown);
}

/**
 * El informe completo de /tool/newsletter. En pantalla solo quedan las cifras y el
 * nicho; todo lo demás vive en este correo.
 */
export async function sendNewsletterReportEmail(to: string, reportMarkdown: string): Promise<void> {
	await sendToolEmail(toolNewsletterTemplate, 'REPORT', to, reportMarkdown);
}

/** Las nueve piezas de /tool/repurpose, agrupadas por canal y con el orden al final. */
export async function sendToolPiecesEmail(to: string, piecesMarkdown: string): Promise<void> {
	await sendToolEmail(toolRepurposeTemplate, 'PIECES', to, piecesMarkdown);
}
```

Los asuntos, las cabeceras y el `from` tienen que salir idénticos a como salían: esto no cambia nada de lo que va por el cable.

- [ ] **Step 3: Comprobar que las cuatro firmas siguen encajando**

```bash
pnpm check
grep -rn "sendToolCopyEmail\|sendToolPostsEmail\|sendNewsletterReportEmail" src/routes/
```

Esperado: `pnpm check` con los 2 errores conocidos, y las tres llamadas de los endpoints existentes intactas (`7-frameworks`, `10-post-types`, `newsletter`), porque las firmas no han cambiado.

- [ ] **Step 4: Commit**

```bash
git add src/lib/emails/tool-repurpose.md src/lib/server/resend.ts
git commit -m "refactor(resend): un solo cuerpo para los correos de las herramientas, y el de repurpose"
```

---

### Task 6: El endpoint

**Files:**
- Create: `src/routes/tool/repurpose/+server.ts`

**Interfaces:**
- Consumes: `scrape`, `UnreadableError` de `$lib/server/scrape`; `askJson`; `subscribe`, `sendToolPiecesEmail`; `isDisposable`; `overLimit`; `normalizeQuoteText`, `unwrapQuotes`, `verifyQuote` de `$lib/tools/quotes`; `extractPrompt`, `writePrompt`, `articleMessage`, `type Article`; `sanitizePieces`, `readOrder`, `toMarkdown`; `gatedFormats`.
- Produces: `POST` con dos pasos.
  - `{ step: 'extract', url }` → `200 { article, pieces, confidence, site, url }` | `422 { error: 'unreadable', reason }` | `429` | `500`
  - `{ step: 'unlock', article, url, email, free }` → `200 { ok: true }` | `400 { error }` | `429` | `502` | `500`

- [ ] **Step 1: Escribir el fichero completo**

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { askJson } from '$lib/server/openai';
import { scrape, UnreadableError } from '$lib/server/scrape';
import { subscribe, sendToolPiecesEmail } from '$lib/server/resend';
import { isDisposable } from '$lib/server/email-validation';
import { overLimit } from '$lib/server/rate-limit';
import { normalizeQuoteText, unwrapQuotes, verifyQuote } from '$lib/tools/quotes';
import {
	articleMessage,
	extractPrompt,
	writePrompt,
	type Article
} from '$lib/tools/repurpose/prompt';
import { readOrder, sanitizePieces, toMarkdown, type Piece } from '$lib/tools/repurpose/format';
import { gatedFormats } from '$lib/tools/repurpose/formats';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * El mismo modelo que las otras dos herramientas: el más rápido de los que Damian
 * comparó y el que más varía el ritmo de las frases, que es lo que hace que no suene
 * a IA. No cambiar sin decírselo.
 */
const MODEL = 'gpt-5.4-mini';

/**
 * Una llamada a OpenAI que devuelve JSON ya parseado.
 *
 * Aquí un fallo sí es fatal —sin piezas no hay nada que enseñar—, así que se
 * convierte el `null` del cliente en una excepción. El cliente y las rarezas de la
 * Responses API están en `$lib/server/openai.ts`: aquí no va un `fetch` suelto.
 */
async function ask(
	system: string,
	user: string,
	maxTokens: number
): Promise<Record<string, unknown>> {
	const data = await askJson({
		model: MODEL,
		instructions: system,
		input: user,
		maxOutputTokens: maxTokens,
		tag: 'tool/repurpose'
	});
	if (!data) throw new Error('openai_failed');
	return data;
}

function readArticle(input: unknown): Article | null {
	if (!input || typeof input !== 'object') return null;
	const { tema, tesis, publico, frase, prueba } = input as Record<string, unknown>;
	const text = (value: unknown, max: number) =>
		typeof value === 'string' ? value.trim().slice(0, max) : '';

	const article: Article = {
		tema: text(tema, 300),
		tesis: text(tesis, 500),
		publico: text(publico, 300),
		frase: text(frase, 400),
		prueba: text(prueba, 600)
	};
	// Sin tema ni tesis no hay artículo del que repartir nada. La frase y la prueba
	// sí pueden faltar: hay piezas que se escriben sin ellas.
	if (!article.tema || !article.tesis) return null;
	return article;
}

/**
 * La URL que puede acabar dentro de la pieza con enlace.
 *
 * Viene de vuelta del navegador, así que se vuelve a validar aquí: lo que sale de
 * nuestro paso 1 es una URL nuestra, pero lo que entra por el cable lo escribe quien
 * quiera. Solo http/https, y si no, cadena vacía — el prompt sabe escribir esa pieza
 * sin enlace.
 */
function readSourceUrl(input: unknown): string {
	if (typeof input !== 'string' || !input.trim()) return '';
	try {
		const url = new URL(input.trim());
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
	} catch {
		return '';
	}
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}

	const step = body.step;
	const ip = getClientAddress();

	// El paso gratis se limita por IP; el caro, por correo (ver rate-limit.ts).
	if (step === 'extract' && overLimit('toolPreview', ip)) {
		return json({ error: 'rate_limit' }, { status: 429 });
	}

	try {
		// --- Paso 1: leer el artículo y escribir las tres gratis, de una pasada ---
		if (step === 'extract') {
			const url = typeof body.url === 'string' ? body.url : '';

			let page;
			try {
				page = await scrape(url);
			} catch (error) {
				if (error instanceof UnreadableError) {
					return json({ error: 'unreadable', reason: error.reason }, { status: 422 });
				}
				throw error;
			}

			const raw = await ask(
				extractPrompt(),
				`URL: ${page.finalUrl}
Título: ${page.title}
Meta descripción: ${page.description}

Texto del artículo:
${page.text}`,
				3500
			);

			const article = readArticle(raw.article);
			const pieces = sanitizePieces(raw);
			if (!article || !pieces.length)
				return json({ error: 'unreadable', reason: 'empty' }, { status: 422 });

			// EL CANDADO: la frase tiene que aparecer en el artículo. Se comprueba contra
			// el MISMO material que se le pasó al modelo, normalizado (ver quotes.ts: la
			// función solo normaliza la aguja). Si no aparece, no se aborta — se vacía, y
			// en el paso 2 las dos piezas de cita se escriben parafraseando. Ninguna de
			// las tres piezas gratis usa cita, así que aquí no hay nada que rehacer.
			const haystack = normalizeQuoteText(`${page.title}\n${page.description}\n${page.text}`);
			const candidate = unwrapQuotes(article.frase);
			article.frase = candidate && verifyQuote(candidate, haystack) ? candidate : '';
			if (candidate && !article.frase) {
				console.warn('[tool/repurpose] cita descartada, no aparece en el artículo:', candidate);
			}

			return json({
				article,
				pieces,
				confidence: raw.confidence === 'baja' ? 'baja' : 'alta',
				site: new URL(page.finalUrl).hostname.replace(/^www\./, ''),
				url: page.finalUrl
			});
		}

		// --- Paso 2: el email. Las seis restantes se mandan al correo y no se enseñan
		//     nunca en pantalla: el correo es el único sitio donde están. ---
		if (step === 'unlock') {
			const article = readArticle(body.article);
			if (!article) return json({ error: 'incomplete_article' }, { status: 400 });

			const email = String(body.email ?? '')
				.trim()
				.toLowerCase();
			if (!EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, { status: 400 });
			if (isDisposable(email)) return json({ error: 'disposable' }, { status: 400 });
			// Por correo, que sí identifica a alguien, y con techo por IP para que nadie
			// encadene direcciones desde la misma conexión.
			if (overLimit('toolDelivery', email) || overLimit('toolDeliveryPerIp', ip)) {
				return json({ error: 'rate_limit' }, { status: 429 });
			}

			const sourceUrl = readSourceUrl(body.url);
			const free: Piece[] = Array.isArray(body.free) ? sanitizePieces({ pieces: body.free }) : [];

			// El alta va primero: si el modelo falla después, el lead ya está dentro.
			try {
				await subscribe(email);
			} catch (error) {
				console.error('[tool/repurpose] subscribe failed:', error);
				return json({ error: 'server_error' }, { status: 500 });
			}

			const raw = await ask(
				writePrompt(gatedFormats.map((format) => format.id)),
				articleMessage(article, sourceUrl),
				5000
			);

			const pieces = sanitizePieces(raw);
			if (!pieces.length) return json({ error: 'server_error' }, { status: 502 });

			const order = readOrder(raw);
			// Vacío es válido y el correo sale igual, pero si pasa siempre hay que
			// enterarse por aquí y no por un correo corto.
			if (!order.length) console.warn('[tool/repurpose] el modelo no devolvió el orden');

			try {
				await sendToolPiecesEmail(email, toMarkdown([...free, ...pieces], order));
			} catch (error) {
				console.error('[tool/repurpose] delivery email failed:', error);
				return json({ error: 'send_failed' }, { status: 502 });
			}

			return json({ ok: true });
		}

		return json({ error: 'bad_request' }, { status: 400 });
	} catch (error) {
		console.error('[tool/repurpose] failed:', error);
		return json({ error: 'server_error' }, { status: 500 });
	}
};
```

- [ ] **Step 2: Comprobar tipos**

```bash
pnpm check
```

Esperado: los 2 errores conocidos y ninguno más.

- [ ] **Step 3: Correr el paso gratis contra un artículo real**

El tipado pasa igual con un 400 de la API. Hay que llamarlo. Arranca el servidor en una terminal:

```bash
pnpm dev
```

Y en otra, con PowerShell:

```powershell
$r = Invoke-RestMethod -Uri http://localhost:5173/tool/repurpose -Method Post -ContentType 'application/json' -Body '{"step":"extract","url":"https://vilmanunez.com/como-crear-mucho-contenido-partiendo-de-una-idea/"}'
$r.article
$r.pieces | ForEach-Object { "--- $($_.id) ---`n$($_.text)" }
"confidence: $($r.confidence) | site: $($r.site)"
"frase verificada: $([bool]$r.article.frase)"
```

Esperado:
- `article` con `tema`, `tesis` y `publico` llenos.
- **Tres** piezas, con ids `nota-pregunta`, `x-corto`, `in-gancho`.
- Ninguna de las tres con comillas de cita ni con URL dentro.
- `x-corto` por debajo de 280 caracteres: compruébalo con `($r.pieces | Where-Object id -eq 'x-corto').text.Length`.
- `confidence: alta`.
- `frase verificada: True` en un artículo normal. Si sale `False`, mira el log del servidor: tiene que haber un `cita descartada`, y entonces el problema está en que el modelo la reescribe — se aprieta esa instrucción del prompt, no se relaja la comprobación.

- [ ] **Step 4: Correr los tres fallos de raspado**

```powershell
foreach ($u in @('no-es-una-url', 'https://localhost/algo', 'https://example.com/pagina-que-no-existe-1234')) {
  try { Invoke-RestMethod -Uri http://localhost:5173/tool/repurpose -Method Post -ContentType 'application/json' -Body (@{step='extract';url=$u} | ConvertTo-Json) }
  catch { "$u -> $($_.ErrorDetails.Message)" }
}
```

Esperado: los tres devuelven `422` con `{"error":"unreadable","reason":...}` y **ninguno** devuelve `500`. El de `localhost` es el que confirma que la guarda SSRF de `scrape.ts` sigue en pie.

- [ ] **Step 5: Correr el paso caro, de verdad, contra tu propio correo**

Manda un correo real y da de alta una dirección en Resend, así que usa la tuya:

```powershell
$body = @{ step='unlock'; article=$r.article; url=$r.url; email='tu@correo.com'; free=$r.pieces } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://localhost:5173/tool/repurpose -Method Post -ContentType 'application/json' -Body $body
```

Esperado: `ok : True`, y en el buzón un correo con asunto «Tu artículo, repartido en nueve piezas» que trae:
- Las **nueve** piezas, agrupadas bajo `Notas de Substack`, `Posts de X` y `Posts de LinkedIn`.
- El bloque «En qué orden publicarlas», con cuatro a seis líneas y **sin fechas ni días**.
- Solo **una** URL en todo el correo, la de la nota-teaser.
- Ninguna línea del modelo convertida en encabezado ni en viñeta.

- [ ] **Step 6: Comprobar que la cita inventada se cae**

Es el candado, y hay que verlo funcionar. Repite el paso 5 cambiando la frase por una que no está en el artículo:

```powershell
$falso = $r.article.PSObject.Copy(); $falso.frase = 'esta frase no aparece en el articulo original'
$body = @{ step='unlock'; article=$falso; url=$r.url; email='tu@correo.com'; free=$r.pieces } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://localhost:5173/tool/repurpose -Method Post -ContentType 'application/json' -Body $body
```

La verificación se hace en el paso 1, así que aquí la frase entra tal cual: lo que confirma este paso es que **una frase distinta no rompe nada** — llegan las nueve piezas igual. La comprobación de que se descarta ya la viste en el log del paso 3.

- [ ] **Step 7: Commit**

```bash
git add src/routes/tool/repurpose/+server.ts
git commit -m "feat(tool/repurpose): el endpoint de los dos pasos"
```

---

### Task 7: El copy y la página

**Files:**
- Create: `src/lib/content/tool-repurpose.md`
- Create: `src/routes/tool/repurpose/+page.svelte`

**Interfaces:**
- Consumes: `parseCopy` de `$lib/content`; `formats`, `freeFormats`, `byChannel` de `$lib/tools/repurpose/formats`; `toPlainText`, `type Piece`; `InlineForm`, `PageMeta`.
- Produces: la página en `/tool/repurpose`.

Las claves del copy que usa el `.svelte` son exactamente las que están abajo. Si añades una en el `.svelte`, añádela aquí.

- [ ] **Step 1: Escribir el copy**

`src/lib/content/tool-repurpose.md`:

```markdown
---
# Textos de /tool/repurpose. Edítalos aquí; no hay copy escrito en el .svelte.

# --- Paso 1: la URL ---
urlPlaceholder: https://tublog.com/tu-articulo
urlButton: Repartir mi artículo
urlWorking: Leyendo tu artículo...
urlHint: El enlace de un artículo tuyo ya publicado.

# --- Paso 2: el resultado ---
# En readLine, {site} se sustituye por el dominio leído.
readLine: He leído {site}.
lowConfidence: Eso no parece un artículo entero, así que he supuesto bastante. Si las piezas no te encajan, ese es el motivo: prueba con el enlace del artículo, no con la portada.
freeBadge: Gratis
copyAction: Copiar
copiedAction: Copiado
restart: Probar con otro artículo
# Etiqueta sobre el ejemplo de cada formato bloqueado. El ejemplo es de otro tema (correr un 10K).
exampleLabel: Un ejemplo de este formato (otro tema):

# --- El muro ---
gateTitle: Las otras seis van por correo
gateBody: Dime a dónde te las mando. Te llegan las nueve, y en qué orden publicarlas.
gatePlaceholder: tu@email.com
gateButton: Mándamelas
gateUnlocking: Escribiendo y enviando...
# Confirmación tras enviar el correo. Las seis no se enseñan aquí: solo van al correo.
sentTitle: Van para tu correo
sentBody: Las nueve, escritas y enviadas, con el orden al final. Si en un par de minutos no lo ves, mira en spam.

# --- Errores ---
# Uno por motivo de los que lanza scrape.ts. errorUnreadable es la red de seguridad.
errorUnreadable: Esa página no me deja leerla. Prueba con otra, o pega el enlace del artículo en lugar de la portada.
errorBlocked: Esa web me cierra la puerta cuando entro yo. Si el artículo está en un sitio con muro, prueba con otro.
errorNotFound: Ahí no hay nada. Revisa el enlace.
errorTimeout: Esa página ha tardado demasiado. Inténtalo otra vez.
errorEmpty: He entrado, pero no he encontrado texto que leer. Pega el enlace del artículo, no el de la portada ni el de una etiqueta.
errorInvalidUrl: Esa dirección no parece válida.
errorInvalidEmail: Ese email no parece válido.
errorDisposable: Eso es un buzón de usar y tirar. Dame uno de verdad, que es donde te mando las piezas.
errorSendFailed: No he podido enviarte el correo. Inténtalo otra vez.
errorRateLimit: Has repartido unos cuantos ya. Espera un rato y vuelve.
errorGeneric: Algo ha fallado por mi parte. Inténtalo otra vez.
errorOffline: No se pudo conectar. Revisa tu conexión.
---

# Repropósito.

**Pega el enlace de un artículo tuyo.** Te lo devuelvo repartido en nueve piezas para redes: tres notas de Substack, tres posts de X y tres de LinkedIn. Cada una escrita para su sitio, no la misma copiada tres veces.

El artículo ya lo escribiste. Esto es cobrarlo nueve veces.
```

- [ ] **Step 2: Escribir la página**

`src/routes/tool/repurpose/+page.svelte`:

```svelte
<script lang="ts">
	import { marked } from 'marked';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { tick } from 'svelte';
	import raw from '$lib/content/tool-repurpose.md?raw';
	import { byChannel, formats, freeFormats } from '$lib/tools/repurpose/formats';
	import { toPlainText, type Piece } from '$lib/tools/repurpose/format';
	import { parseCopy } from '$lib/content';
	import InlineForm from '$lib/components/InlineForm.svelte';

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;

	type Busy = '' | 'reading' | 'unlocking';

	let busy = $state<Busy>('');
	let error = $state('');

	/** El enlace que ha pegado la persona. */
	let url = $state('');
	/** El núcleo del artículo. Viaja al servidor otra vez para escribir las seis restantes. */
	let article = $state<Record<string, string> | null>(null);
	/** La URL final tras redirecciones, la única que puede acabar en la pieza con enlace. */
	let finalUrl = $state('');
	let site = $state('');
	let lowConfidence = $state(false);

	let pieces = $state<Piece[]>([]);
	/** El correo con las nueve ya ha salido. */
	let sent = $state(false);
	let email = $state('');
	let copiedId = $state('');

	const byId = $derived(new Map(pieces.map((piece) => [piece.id, piece])));

	/**
	 * Las escritas primero, agrupadas por canal; las bloqueadas detrás del muro,
	 * también por canal. Se agrupa con el mismo `byChannel` que el correo.
	 */
	const freeGroups = $derived(byChannel(formats.filter((format) => byId.has(format.id))));
	const lockedGroups = $derived(byChannel(formats.filter((format) => !byId.has(format.id))));

	function errorFor(code: unknown, reason?: unknown): string {
		if (code === 'unreadable') {
			if (reason === 'blocked') return t.errorBlocked;
			if (reason === 'not_found') return t.errorNotFound;
			if (reason === 'timeout') return t.errorTimeout;
			if (reason === 'empty') return t.errorEmpty;
			if (reason === 'invalid_url') return t.errorInvalidUrl;
			return t.errorUnreadable;
		}
		if (code === 'invalid_email') return t.errorInvalidEmail;
		if (code === 'disposable') return t.errorDisposable;
		if (code === 'send_failed') return t.errorSendFailed;
		if (code === 'rate_limit') return t.errorRateLimit;
		return t.errorGeneric;
	}

	async function post(payload: Record<string, unknown>) {
		const response = await fetch('/tool/repurpose', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const data = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(errorFor(data?.error, data?.reason));
		return data;
	}

	async function read() {
		busy = 'reading';
		error = '';
		try {
			const data = await post({ step: 'extract', url });
			article = data.article;
			pieces = data.pieces;
			finalUrl = data.url ?? '';
			site = data.site ?? '';
			lowConfidence = data.confidence === 'baja';
			await tick();
			document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	/**
	 * Las seis restantes se mandan por correo y no se enseñan nunca aquí. El correo
	 * es el único sitio donde están, y por eso el email vale algo.
	 */
	async function unlock() {
		busy = 'unlocking';
		error = '';
		try {
			await post({ step: 'unlock', article, url: finalUrl, email, free: pieces });
			sent = true;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : t.errorOffline;
		} finally {
			busy = '';
		}
	}

	async function copyToClipboard(piece: Piece) {
		await navigator.clipboard.writeText(toPlainText(piece));
		copiedId = piece.id;
		setTimeout(() => {
			if (copiedId === piece.id) copiedId = '';
		}, 2000);
	}

	function restart() {
		busy = '';
		error = '';
		url = '';
		article = null;
		finalUrl = '';
		site = '';
		lowConfidence = false;
		pieces = [];
		sent = false;
		email = '';
		copiedId = '';
	}
</script>

<PageMeta
	title="Repropósito — Damian Soto"
	description="Pega el enlace de un artículo tuyo y te lo devuelvo repartido en nueve piezas para redes: notas de Substack, posts de X y de LinkedIn. Tres, gratis."
/>

<!--
	El crédito y la introducción se reutilizan con snippets: en el estado inicial el
	crédito va debajo del formulario, y con resultados va al final.
-->
{#snippet credit()}
	<p class="muted">
		Dos lecturas que hay detrás de esto, si te interesa el asunto:
		<a
			href="https://vilmanunez.com/como-crear-mucho-contenido-partiendo-de-una-idea/"
			target="_blank"
			rel="noopener noreferrer"
			class="link">Cómo crear mucho contenido partiendo de una idea</a
		>, de Vilma Núñez, y lo que escribe
		<a
			href="https://nataliapapiol.substack.com/"
			target="_blank"
			rel="noopener noreferrer"
			class="link">Natalia Papiol</a
		> sobre notas. Los nueve formatos son míos.
	</p>
{/snippet}

{#snippet intro_()}
	<article class="prose prose-xl prose-neutral max-w-none">
		<!-- Markdown propio del repo (src/lib/content/tool-repurpose.md), igual que la
		     home. No hay nada del visitante aquí dentro. -->
		{@html intro}
	</article>
{/snippet}

{#if !pieces.length}
	{@render intro_()}

	{#if error}
		<p class="mt-6 text-sm text-error">{error}</p>
	{/if}

	<div class="mt-8">
		<InlineForm
			bind:value={url}
			placeholder={t.urlPlaceholder}
			label={t.urlButton}
			busyLabel={t.urlWorking}
			busy={busy === 'reading'}
			inputmode="url"
			autocomplete="url"
			onsubmit={read}
		/>
		<p class="muted mt-2">{t.urlHint}</p>
	</div>

	<!-- El crédito, justo debajo del formulario. -->
	<div class="mt-6">{@render credit()}</div>
{:else}
	{@render intro_()}

	{#if error}
		<p class="mt-6 text-sm text-error">{error}</p>
	{/if}
{/if}

<!-- Paso 2: las piezas -->
{#if pieces.length}
	<section id="resultado" class="mt-10 space-y-6">
		{#if site}<p class="muted">{t.readLine.replace('{site}', site)}</p>{/if}
		{#if lowConfidence}<p class="muted">{t.lowConfidence}</p>{/if}

		<!-- Las tres escritas, agrupadas por canal. -->
		{#each freeGroups as group (group.channel)}
			<h2 class="eyebrow">{group.name}</h2>
			{#each group.items as format (format.id)}
				{@const written = byId.get(format.id)}
				{#if written}
					<article class="box">
						<header class="mb-4 flex items-start justify-between gap-3">
							<div>
								<h3 class="box-title">
									{format.name}
									{#if freeFormats.some((free) => free.id === format.id)}
										<span class="badge badge-sm badge-neutral align-middle">{t.freeBadge}</span>
									{/if}
								</h3>
								<p class="muted">{format.bestFor}</p>
							</div>
							<button
								type="button"
								onclick={() => copyToClipboard(written)}
								class="btn btn-ghost btn-xs shrink-0"
							>
								{copiedId === format.id ? t.copiedAction : t.copyAction}
							</button>
						</header>

						<p class="body-text whitespace-pre-wrap">{written.text}</p>
					</article>
				{/if}
			{/each}
		{/each}

		<!-- El muro va justo después de lo que ya ha leído. Si lo dejamos al final,
		     queda detrás de seis tarjetas vacías y nadie baja tanto. -->
		<section class="box bg-line/40">
			{#if sent}
				<h3 class="section-title">{t.sentTitle}</h3>
				<p class="section-intro">{t.sentBody}</p>
			{:else}
				<h3 class="section-title">{t.gateTitle}</h3>
				<p class="section-intro">{t.gateBody}</p>
				<!-- Input y botón en la misma línea. El input se encoge (min-w-0) y el
				     botón no, para que quepan juntos también en móvil. -->
				<div class="mt-4">
					<InlineForm
						type="email"
						bind:value={email}
						placeholder={t.gatePlaceholder}
						label={t.gateButton}
						busyLabel={t.gateUnlocking}
						busy={busy === 'unlocking'}
						inputmode="email"
						autocomplete="email"
						onsubmit={unlock}
					/>
				</div>
			{/if}
		</section>

		<!-- Bloqueadas: se ve el formato y un ejemplo de la forma (otro tema), nunca el
		     texto sobre TU artículo. Las seis no se generan hasta que entra el email,
		     así que aquí no hay nada que descubrir mirando el HTML: el ejemplo es fijo
		     y sale de formats.ts. -->
		{#each lockedGroups as group (group.channel)}
			<h2 class="eyebrow">{group.name}</h2>
			{#each group.items as format (format.id)}
				<article class="box-locked">
					<h3 class="box-title text-muted">{format.name}</h3>
					<p class="muted mb-4">{format.bestFor}</p>
					<p class="eyebrow opacity-70">{t.exampleLabel}</p>
					<p class="body-text mt-1 whitespace-pre-wrap text-muted">{format.example}</p>
				</article>
			{/each}
		{/each}

		<button type="button" onclick={restart} class="link-quiet">
			{t.restart}
		</button>
	</section>
{/if}

{#if pieces.length}
	<footer class="section border-t border-line pt-6">
		{@render credit()}
	</footer>
{/if}
```

- [ ] **Step 3: Comprobar tipos y que el copy no tiene claves de menos**

```bash
pnpm check
grep -o "t\.[a-zA-Z]*" src/routes/tool/repurpose/+page.svelte | sort -u
```

Cada clave que salga del `grep` tiene que existir en el frontmatter de `src/lib/content/tool-repurpose.md`. Una que falte no rompe el tipado: sale `undefined` en pantalla.

- [ ] **Step 4: Abrirla en el navegador y usarla como la usaría alguien**

Con `pnpm dev` corriendo, entra en `http://localhost:5173/tool/repurpose` y comprueba:

- El campo, el botón y el crédito, sin resultados.
- Pega el enlace de un artículo real: aparecen **tres** tarjetas escritas, agrupadas bajo «Notas de Substack», «Posts de X» y «Posts de LinkedIn», con su badge «Gratis», y el «He leído …».
- El muro justo detrás de la tercera, y **detrás** las seis bloqueadas con su ejemplo.
- «Copiar» cambia a «Copiado» y vuelve a los dos segundos.
- **En el HTML de la página no hay ni una de las seis piezas de pago.** Búscalo con Ctrl+U y busca una frase de la tarjeta bloqueada: lo único que aparece es el `example` de `formats.ts`.
- A 320 px de ancho (las devtools) nada se sale ni desborda en horizontal.
- Deja el correo: sale «Van para tu correo» y el correo llega.
- «Probar con otro artículo» deja la página como estaba.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/tool-repurpose.md src/routes/tool/repurpose/+page.svelte
git commit -m "feat(tool/repurpose): la pagina y su copy"
```

---

### Task 8: Sacarla a la home y escribirla en CLAUDE.md

**Files:**
- Modify: `src/lib/tools/list.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: la entrada en la home y la documentación de la herramienta.

- [ ] **Step 1: Añadirla a la lista de la home**

En `src/lib/tools/list.ts`, un objeto más al final de `tools`:

```ts
	{
		name: 'Un artículo, repartido en 9 piezas',
		href: '/tool/repurpose',
		blurb: 'Pegas el enlace de un artículo tuyo y te lo devuelvo en notas de Substack y posts de X y LinkedIn.',
		capturesEmail: true
	}
```

- [ ] **Step 2: Escribir la herramienta en CLAUDE.md**

En la tabla de la sección **Tools**, una fila más:

```markdown
| `repurpose` | Listed. Built on the site theme. |
```

Y detrás del bloque de `/tool/10-post-types`, esta sección — es lo durable de este trabajo, y lo que evita que alguien deshaga una decisión por parecer un error:

```markdown
**`/tool/repurpose`** takes **the URL of an article** and returns it split into nine
native pieces: three Substack notes, three X posts, three LinkedIn posts, from
`src/lib/tools/repurpose/formats.ts`. Three — **one per channel** — are free on screen;
the other six are emailed, plus a short block saying in what order to publish them.

Unlike the other two tools, **the nine formats are ours**. There is no source article to
audit a `hint` against: two references are credited at the foot of the page (Vilma Núñez
on splitting one base piece per channel, Natalia Papiol on Spanish Substack notes) as
reading, not as skeleton — deliberately, so the tool isn't tied to one publication's
method. The hook lines are adapted from Cervantes' own `HOOK-FORMULAS.md`.

**The two quote-based pieces (`nota-cita`, `x-cita`) are behind the gate for a technical
reason, not a commercial one.** The verbatim quote is verified server-side *after* the
model answers, and in the free step the piece and the quote come out of the same call —
the check would land after the quote is already on screen. Behind the gate it runs
first. That's why the free Substack piece is `nota-pregunta`. Don't "improve" this by
making `nota-cita` free.

Two things came out to shared modules next to `voice.ts` while building this:
`escapeMarkdown` now lives in `src/lib/tools/markdown.ts` and all three tools import it
(it was copied twice and this would have been the third), and `verifyQuote` moved to
`src/lib/tools/quotes.ts`.

`verifyQuote` is shared with `newsletter` because
duplicating the normalisation is asking for the two copies to drift. **It normalises only
the needle** — pass the haystack through `normalizeQuoteText` first, and strip wrapping
quotes with `unwrapQuotes`, or `«…»` becomes `"…"` inside the needle and a correct quote
gets rejected.

`nota-teaser` is the only piece that carries the link. The URL comes back from the
browser and is re-validated (`readSourceUrl`): http/https only, empty otherwise, and the
prompt knows how to write that piece with no link.
```

Y en la sección **Email**, la lista de correos de una sola pieza: añadir `tool-repurpose.md` a los ejemplos, y una línea sobre que las cuatro salen ya por un solo `sendToolEmail`.

- [ ] **Step 3: Comprobar la home**

Con `pnpm dev`, entra en `http://localhost:5173/` y baja a la lista: la entrada nueva sale al final, el enlace lleva a `/tool/repurpose` y el blurb no pasa de dos líneas en móvil (320 px).

- [ ] **Step 4: Comprobación final**

```bash
pnpm check
pnpm build
```

Esperado: `check` con los 2 errores conocidos y ninguno más; `build` sin errores.

Y una última pasada de la herramienta entera, contra un artículo distinto a los de la Task 6 —uno de Substack, que es el caso más probable— hasta que llegue el correo con las nueve.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tools/list.ts CLAUDE.md
git commit -m "feat(tool/repurpose): sacarla a la home y documentarla"
```

---

## Notas para quien ejecute esto

- **La rama.** `master` es la rama por defecto de este repo. Haz una rama antes del primer commit.
- **Cuesta dinero.** Cada `extract` y cada `unlock` son llamadas reales a OpenAI, y cada `unlock` da de alta un contacto en Resend y manda un correo. Usa tu propia dirección y no repitas los pasos por gusto: `toolDelivery` son 3 al día por correo.
- **Si `pnpm check` saca un error nuevo, párate ahí.** No sigas a la tarea siguiente arrastrándolo.
- **Los 400 de OpenAI no los ve el tipado.** Están todos documentados en la cabecera de `src/lib/server/openai.ts`: el tope es `max_output_tokens`, solo se acepta la temperatura por defecto, la respuesta está en `output[]` y no en `choices[0]`, y sin esquema la palabra «json» tiene que aparecer en `input` (el cliente la añade si falta). Si un paso devuelve `server_error`, mira el log del servidor antes de tocar el prompt.
