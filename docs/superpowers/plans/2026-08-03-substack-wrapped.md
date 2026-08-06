# Wrapped de Substack (`/author/[author]`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pegar la URL de un newsletter de Substack y obtener una tarjeta pública y compartible, con métricas que su autor no puede ver agregadas en su panel, firmada por Damian.

**Architecture:** Un único módulo hace red (`substack-archive.ts`): pagina `/api/v1/archive` hasta agotarlo y cae a `/feed` si no puede. Todo el cálculo vive en funciones **puras** (`metrics.ts`, `lines.ts`) que se testean con fixtures. La página pide solo los metadatos baratos en el servidor —para renderizar `og:` al instante— y el cliente consume un stream NDJSON con el progreso real del recorrido. El PNG se genera con `@vercel/og`, reusando el patrón que ya existe en `src/routes/og/[slug].png/+server.ts`.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript strict, Tailwind 4 sobre el tema de `src/app.css`, `@vercel/og` (ya instalado), `vitest` (se añade en la Task 1).

## Global Constraints

- **Código en inglés, copy en español.** Nombres de fichero, rutas, identificadores y **comentarios** en inglés; todo lo que lee un visitante en español. (`CLAUDE.md`)
- **Solo dos tamaños de letra en el sitio**: body `1.25rem` y nota `0.875rem`. Escribir `text-4xl` en el markup significa que falta una clase en `app.css`. Los números grandes de la tarjeta entran como **una clase nueva** en `@layer components`, no como utilidades sueltas.
- **Nunca inventar ni estimar un número.** Si un dato no sale limpio de los datos públicos, no aparece. La única excepción aprobada es la equivalencia en libros, que **muestra siempre su divisor** (80.000 palabras/novela).
- **La tarjeta halaga o sitúa, nunca corrige.** Cero tono de auditoría. Llega a alguien que no la ha pedido.
- **Sin puerta de email.** Esta es la primera herramienta de `list.ts` sin `capturesEmail`. No toca `resend.ts` ni `emails/`.
- **Sin llamadas a OpenAI.** Las frases son plantillas elegidas por regla. No se toca `openai.ts`. **Nunca cambiar el modelo** de nada (es `gpt-5.4-mini`, decisión de Damian).
- **Peticiones secuenciales, 300 ms entre páginas, máximo 50 páginas.** En paralelo sería martillear el servidor de otro.
- `pnpm check` **ya reporta 2 errores conocidos** (`src/routes/demo/paraglide` y `src/routes/tool/places-evaluator`). Limpio significa "ningún error *nuevo*", no cero.
- Números formateados en `es-ES` (`8.854`, no `8,854`).

## Hechos medidos contra publicaciones reales (3 de agosto de 2026)

Estos números vienen de ejecutar los endpoints, no de la documentación. No los re-derives; si algo no cuadra, vuelve a medir antes de cambiar el código.

| Hecho | Valor |
|---|---|
| `limit` máximo de `/api/v1/archive` | **50**. Con `100` responde `400 {"errors":[{"param":"limit","msg":"Invalid value"}]}` |
| `offset=0` | **Devuelve 23 posts como máximo**, sea cual sea `limit`. Con `offset=1` devuelve 50. Medido igual en 3 publicaciones |
| Paginación correcta | `offset += recibidos.length`, parar con array vacío. Sin duplicados en 1330 posts |
| Archivo profundo | `www.honest-broker.com`: 1330 posts, 29 peticiones, 20,8 s con 300 ms de espera |
| Campos nunca ausentes | `title`, `post_date`, `audience`, `type`, `wordcount`, `reaction_count`, `comment_count`, `slug` |
| `wordcount` | Presente en **868/868, 128/128, 167/167**. Ni un cero |
| `restacks` | **Array vacío en 868 de 868.** Campo muerto, no usarlo |
| `postTags` | 17 de 128 en liderar, 0 en las otras. Demasiado disperso |
| `first_post_date` | **Miente**: Gioia `2000-01-01`, liderar `2011-06-28`. Usar `created_at` |
| Fechas basura | **435 de los 1330 posts de Gioia están fechados `2000-01-01`** (archivo importado) |
| `type` | `newsletter`, `podcast`, `restack` |
| Dominio propio | `www.honest-broker.com` → 200. **`honest-broker.com` a secas → 404.** `thefp.com` → 301 a `www.thefp.com` → 200 |
| `/feed` | 20 items. Solo `title`, `link`, `pubDate`, `description`, `dc:creator`, `enclosure`. **Sin likes, sin comentarios, sin audience** |
| Día de la semana | Día top: Gioia 17%, liderar 18%. Plano = 14,3%. **Es ruido salvo que haya concentración real** |
| Hora del día | Kloshletter: **49% a las 05h + 44% a las 06h** (UTC). Gioia 22% a las 18h. Liderar 10% |

Publicaciones de referencia para verificación manual:
- `www.honest-broker.com` — archivo profundo con importación basura y posts de pago
- `liderar.substack.com` — importado, con secciones y coautores, todo gratis
- `kloshletter.substack.com` — diario, joven, sin pagos, hora muy concentrada
- `platformer.news` — **no responde como Substack**: sirve para el estado de error

---

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/lib/server/substack.ts` | **Crear.** Helpers HTTP compartidos extraídos de `newsletter.ts`: `get`, `readBody`, `preloads`, `decode`, `toOrigin` |
| `src/lib/server/newsletter.ts` | **Modificar.** Importa esos helpers en vez de definirlos. Sin cambio de comportamiento |
| `src/lib/server/substack-archive.ts` | **Crear.** El único módulo con red: recorrido paginado, fallback RSS, resolución de origen |
| `src/lib/server/author-cache.ts` | **Crear.** La tarjeta ya calculada, en memoria. La comparten el stream y el PNG: sin módulo compartido, una tarjeta costaría dos recorridos |
| `src/lib/authors/slug.ts` | **Crear.** slug ↔ orígenes candidatos. Puro |
| `src/lib/authors/metrics.ts` | **Crear.** Posts → métricas. **Puro, cero I/O** |
| `src/lib/authors/lines.ts` | **Crear.** Frases de plantilla y la regla que elige cuál sale |
| `src/lib/authors/card.ts` | **Crear.** El árbol satori del PNG |
| `src/lib/authors/fixtures.ts` | **Crear.** Fixtures con las trampas medidas, para los tests |
| `src/lib/content/author.md` | **Crear.** Todo el copy de la página |
| `src/lib/components/author/Heatmap.svelte` | **Crear.** Mapa de calor de semanas |
| `src/lib/components/author/Bars.svelte` | **Crear.** Barras sobre `.meter` (palabras y posts por año) |
| `src/routes/author/+page.server.ts` | **Crear.** Normaliza la URL y redirige a la canónica |
| `src/routes/author/+page.svelte` | **Crear.** Landing con el formulario |
| `src/routes/author/[author]/+page.server.ts` | **Crear.** Solo los metadatos baratos + cabeceras de caché |
| `src/routes/author/[author]/+page.svelte` | **Crear.** La tarjeta y el consumo del stream |
| `src/routes/author/[author]/archive/+server.ts` | **Crear.** NDJSON: progreso y métricas. Caché en memoria + rate limit |
| `src/routes/author/[author]/card.png/+server.ts` | **Crear.** El PNG |
| `src/app.css` | **Modificar.** Clases `.figure`, `.figure-note`, `.heat`, `.heat-cell` |
| `src/lib/server/rate-limit.ts` | **Modificar.** Una entrada `authorCard` en `LIMITS` |
| `src/lib/tools/list.ts` | **Modificar.** La entrada nueva. **Va en la última task**: es lo que la publica |
| `package.json`, `vite.config.ts` | **Modificar.** vitest |

---

### Task 1: vitest y fixtures con las trampas medidas

El repo no tiene runner de tests. `metrics.ts` codifica ~15 reglas de umbral y filtrado sacadas de mediciones; sin tests, cada una es inverificable y un suelo de fecha mal puesto produce una tarjeta con números falsos en silencio.

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/lib/authors/fixtures.ts`
- Test: `src/lib/authors/fixtures.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `ArchivePost` (el tipo lo define la Task 4; aquí se declara **en `fixtures.ts` como import de `$lib/server/substack-archive`**, así que esta task crea también ese fichero con solo el tipo dentro). `deepFixture()`, `youngFixture()`, `tinyFixture()`.

- [ ] **Step 1: Instalar vitest**

```bash
pnpm add -D vitest@^3
```

- [ ] **Step 2: Añadir el script de test**

En `package.json`, dentro de `"scripts"`, tras la línea de `"check:watch"`:

```json
		"test": "vitest run",
		"test:watch": "vitest"
```

- [ ] **Step 3: Configurar vitest en vite.config.ts**

Sustituye el `export default defineConfig({...})` entero por:

```ts
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	],
	// Los tests solo cubren los módulos puros ($lib/authors) y el recorrido del
	// archivo con fetch simulado. No hay tests de componentes: el DOM no aporta
	// aquí y añadiría jsdom por nada.
	test: {
		include: ['src/**/*.test.ts']
	}
});
```

- [ ] **Step 4: Crear el tipo del post, que es lo que consumen los fixtures**

Crea `src/lib/server/substack-archive.ts` con solo esto (la Task 4 le añade la red):

```ts
/**
 * Un post tal y como lo deja `/api/v1/archive`, ya reducido a lo que se usa.
 *
 * Los nueve campos están MEDIDOS como presentes en 868/868, 128/128 y 167/167
 * posts de tres publicaciones reales, así que no son opcionales. Los que sí
 * pueden faltar (`subtitle`, `sectionName`) llevan su valor vacío.
 *
 * NO añadas `restacks`: el campo existe en la respuesta y llega como array
 * vacío en 868 de 868 posts. Se comprobó; está muerto.
 */
export type ArchivePost = {
	title: string;
	subtitle: string;
	slug: string;
	/** ISO completo, con hora. La hora se usa: es un dato de la tarjeta. */
	date: string;
	/** 'everyone' es gratis; 'only_paid' y el resto son de pago. */
	audience: string;
	/** 'newsletter' | 'podcast' | 'restack'. Un restack es el post de OTRA persona. */
	type: string;
	words: number;
	reactions: number;
	comments: number;
	/** Respuestas dentro de los hilos. Suma aparte de `comments`. */
	childComments: number;
	sectionName: string;
};
```

- [ ] **Step 5: Escribir los fixtures**

Crea `src/lib/authors/fixtures.ts`:

```ts
import type { ArchivePost } from '$lib/server/substack-archive';

/**
 * Fixtures para los tests de métricas.
 *
 * No son dumps reales: son archivos mínimos que llevan dentro LAS TRAMPAS
 * MEDIDAS en publicaciones de verdad, que es lo único que hace falta probar.
 *
 *   - posts fechados antes de `created_at` (archivo importado)
 *   - un post fechado exactamente 2000-01-01, como los 435 de The Honest Broker
 *   - un `restack`, que es el post de otra persona
 *   - un `podcast`, que sí es obra suya
 *   - mezcla de `everyone` y `only_paid`
 *   - una racha de semanas seguidas y un salto en medio
 */

function post(over: Partial<ArchivePost> & { date: string }): ArchivePost {
	return {
		title: 'Un título cualquiera',
		subtitle: '',
		slug: 'slug-' + over.date.slice(0, 10),
		audience: 'everyone',
		type: 'newsletter',
		words: 1000,
		reactions: 10,
		comments: 2,
		childComments: 1,
		sectionName: '',
		...over
	};
}

/** Lunes de semanas ISO consecutivas a partir de una fecha. */
function weekly(startISO: string, count: number, over: Partial<ArchivePost> = {}): ArchivePost[] {
	const start = new Date(startISO).getTime();
	return Array.from({ length: count }, (_, i) =>
		post({ ...over, date: new Date(start + i * 7 * 86400000).toISOString() })
	);
}

/** `created_at` del archivo profundo. Todo lo anterior es importación. */
export const DEEP_CREATED_AT = '2024-01-01T00:00:00.000Z';

/**
 * Archivo profundo: 30 semanas seguidas desde enero de 2024, un salto de 3
 * semanas, otras 10 seguidas, y basura importada delante.
 */
export function deepFixture(): ArchivePost[] {
	return [
		// Importación: fecha imposible, como los 435 posts de Gioia.
		post({ date: '2000-01-01T17:00:00.000Z', title: 'Reseña importada', reactions: 3, words: 500 }),
		// Importación con fecha plausible pero anterior a created_at.
		post({ date: '2011-06-28T23:11:55.000Z', title: 'Otro importado', reactions: 1, words: 400 }),
		// El post de otra persona. No cuenta como suyo para nada.
		post({ date: '2024-03-04T10:00:00.000Z', type: 'restack', title: 'Post ajeno', reactions: 9999 }),
		// 30 semanas seguidas, todas a las 06:00 UTC de un lunes.
		...weekly('2024-01-01T06:00:00.000Z', 30, { words: 2000 }),
		// Salto: la siguiente cae 3 semanas después de la última.
		...weekly('2024-08-19T06:00:00.000Z', 10, { words: 2000, audience: 'only_paid' }),
		// El techo de likes y de comentarios, y el post más largo.
		// Va un miércoles y no un lunes para no chocar de slug con la serie
		// semanal, que empieza en lunes: cae en la misma semana ISO, así que no
		// altera ninguna racha.
		post({
			date: '2024-05-08T06:00:00.000Z',
			title: 'El techo de la casa',
			words: 9000,
			reactions: 8854,
			comments: 1246,
			childComments: 500
		}),
		// Un podcast: es obra suya, cuenta. Miércoles por el mismo motivo.
		post({ date: '2024-06-05T06:00:00.000Z', type: 'podcast', title: 'Episodio uno', words: 300 })
	];
}

/** Publicación joven: 6 semanas, ninguna trampa. Para los umbrales bajos. */
export function youngFixture(): ArchivePost[] {
	return weekly('2026-06-01T05:00:00.000Z', 6);
}

/** Menos del mínimo: no hay tarjeta que hacer. */
export function tinyFixture(): ArchivePost[] {
	return weekly('2026-07-06T05:00:00.000Z', 3);
}
```

- [ ] **Step 6: Escribir el test que verifica que los fixtures llevan las trampas**

Crea `src/lib/authors/fixtures.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deepFixture, youngFixture, tinyFixture, DEEP_CREATED_AT } from './fixtures';

describe('fixtures', () => {
	it('el archivo profundo lleva las trampas medidas', () => {
		const posts = deepFixture();
		expect(posts.some((p) => p.date.startsWith('2000-01-01'))).toBe(true);
		expect(posts.some((p) => p.date < DEEP_CREATED_AT)).toBe(true);
		expect(posts.some((p) => p.type === 'restack')).toBe(true);
		expect(posts.some((p) => p.type === 'podcast')).toBe(true);
		expect(posts.some((p) => p.audience === 'only_paid')).toBe(true);
	});

	it('los fixtures pequeños tienen el tamaño que dicen', () => {
		expect(youngFixture()).toHaveLength(6);
		expect(tinyFixture()).toHaveLength(3);
	});
});
```

- [ ] **Step 7: Ejecutar los tests**

Run: `pnpm test`
Expected: PASS, 2 tests.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts src/lib/server/substack-archive.ts src/lib/authors/fixtures.ts src/lib/authors/fixtures.test.ts
git commit -m "test: add vitest and Substack archive fixtures"
```

---

### Task 2: `slug.ts` — slug ↔ orígenes candidatos

**Files:**
- Create: `src/lib/authors/slug.ts`
- Test: `src/lib/authors/slug.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `slugFromUrl(raw: string): string | null`, `originsForSlug(slug: string): string[]`, `isValidSlug(slug: string): boolean`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/lib/authors/slug.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slugFromUrl, originsForSlug, isValidSlug } from './slug';

describe('slugFromUrl', () => {
	it('un subdominio de substack se queda en su nombre', () => {
		expect(slugFromUrl('https://kloshletter.substack.com')).toBe('kloshletter');
		expect(slugFromUrl('kloshletter.substack.com')).toBe('kloshletter');
	});

	it('da igual que peguen un post concreto', () => {
		expect(slugFromUrl('https://kloshletter.substack.com/p/algo?utm=x')).toBe('kloshletter');
	});

	it('un dominio propio conserva el dominio y pierde el www', () => {
		expect(slugFromUrl('https://www.honest-broker.com')).toBe('honest-broker.com');
		expect(slugFromUrl('https://honest-broker.com/archive')).toBe('honest-broker.com');
	});

	it('rechaza lo que no es una URL', () => {
		expect(slugFromUrl('')).toBe(null);
		expect(slugFromUrl('no es una url')).toBe(null);
		expect(slugFromUrl('ftp://algo.com')).toBe(null);
	});
});

describe('originsForSlug', () => {
	it('un slug sin punto es un subdominio de substack', () => {
		expect(originsForSlug('kloshletter')).toEqual(['https://kloshletter.substack.com']);
	});

	it('un slug con punto se prueba a secas y con www', () => {
		// Medido: honest-broker.com a secas devuelve 404 y solo responde en www.
		expect(originsForSlug('honest-broker.com')).toEqual([
			'https://honest-broker.com',
			'https://www.honest-broker.com'
		]);
	});
});

describe('isValidSlug', () => {
	it('acepta lo que produce slugFromUrl y rechaza el resto', () => {
		expect(isValidSlug('kloshletter')).toBe(true);
		expect(isValidSlug('honest-broker.com')).toBe(true);
		expect(isValidSlug('../etc/passwd')).toBe(false);
		expect(isValidSlug('algo con espacios')).toBe(false);
		expect(isValidSlug('a'.repeat(200))).toBe(false);
	});
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/lib/authors/slug.test.ts`
Expected: FAIL — no existe el módulo `./slug`.

- [ ] **Step 3: Implementar**

Crea `src/lib/authors/slug.ts`:

```ts
/**
 * El slug de la URL de la tarjeta, en las dos direcciones.
 *
 * `/author/kloshletter` y `/author/honest-broker.com` tienen que poder volver a
 * ser un origen que responda, porque la página se regenera solo con el slug.
 *
 * POR QUÉ SON DOS ORÍGENES Y NO UNO
 *
 * Se midió: `www.honest-broker.com` responde 200 y `honest-broker.com` a secas
 * devuelve **404**. Al contrario, `thefp.com` redirige a `www.thefp.com`. O sea
 * que ni quitar el `www` ni ponerlo siempre funciona: hay que probar los dos y
 * quedarse con el que contesta. Por eso `originsForSlug` devuelve una lista y
 * quien la use se queda con el primero que responda.
 */

const SUBSTACK_SUFFIX = '.substack.com';

/** Lo que puede aparecer en un segmento de ruta sin sorpresas. */
const SLUG_RE = /^[a-z0-9]([a-z0-9.-]{0,98}[a-z0-9])?$/;

export function isValidSlug(slug: string): boolean {
	// Sin `..`: el slug acaba dentro de una URL y no queremos recorridos raros.
	return SLUG_RE.test(slug) && !slug.includes('..');
}

/**
 * De lo que escriba el visitante al slug canónico. `null` si no es una URL http.
 */
export function slugFromUrl(raw: string): string | null {
	const trimmed = raw.trim().toLowerCase();
	if (!trimmed) return null;

	let url: URL;
	try {
		url = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

	const host = url.hostname.replace(/^www\./, '');
	if (!host.includes('.')) return null;

	const slug = host.endsWith(SUBSTACK_SUFFIX) ? host.slice(0, -SUBSTACK_SUFFIX.length) : host;
	return isValidSlug(slug) ? slug : null;
}

/** Los orígenes que hay que probar, en orden, para un slug. */
export function originsForSlug(slug: string): string[] {
	if (!isValidSlug(slug)) return [];
	if (!slug.includes('.')) return [`https://${slug}${SUBSTACK_SUFFIX}`];
	return [`https://${slug}`, `https://www.${slug}`];
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `pnpm vitest run src/lib/authors/slug.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authors/slug.ts src/lib/authors/slug.test.ts
git commit -m "feat(author): map newsletter URLs to canonical card slugs"
```

---

### Task 3: extraer los helpers HTTP de `newsletter.ts`

Refactor sin cambio de comportamiento. El truco del doble `JSON.parse` de `window._preloads` y el fetch con guard SSRF son código que costó descubrir; duplicarlo es cómo se desincronizan las dos copias. Es la postura que ya fija `CLAUDE.md`: el cliente de una API va en un módulo reusable de `$lib/server`.

**Files:**
- Create: `src/lib/server/substack.ts`
- Modify: `src/lib/server/newsletter.ts` (borrar `TIMEOUT_MS`, `MAX_BYTES`, `toOrigin`, `get`, `body`, `decode`, `preloads`; importarlos)

**Interfaces:**
- Consumes: `assertPublicUrl`, `BROWSER_UA`, `UnreadableError` de `$lib/server/scrape`
- Produces: `get(url: URL, accept: string): Promise<Response>`, `readBody(response: Response): Promise<string>`, `decode(input: string): string`, `preloads(html: string): Record<string, unknown>`, `toOrigin(raw: string): URL`, `UnreadableError` (reexportado)

- [ ] **Step 1: Crear el módulo compartido**

Crea `src/lib/server/substack.ts` moviendo el código **tal cual** desde `newsletter.ts` (líneas 41-42, 211-222, 239-289 y 301-323 del fichero actual):

```ts
import { assertPublicUrl, BROWSER_UA, UnreadableError } from './scrape';

// Se reexporta para que quien use este módulo no tenga que importar de scrape.
export { UnreadableError };

/**
 * Lo común de hablar con Substack: pedir, leer con tope, desescapar entidades y
 * sacar `window._preloads`.
 *
 * Estaba dentro de `newsletter.ts` y salió aquí cuando el Wrapped necesitó lo
 * mismo. No lo copies en un tercer sitio: el doble `JSON.parse` de `_preloads`
 * y el guard SSRF son código que costó encontrar, y dos copias se desincronizan.
 */

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;

/** Normaliza lo que escriba el visitante a la portada de la publicación. */
export function toOrigin(raw: string): URL {
	const trimmed = raw.trim();
	if (!trimmed) throw new UnreadableError('invalid_url');
	try {
		const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
		// Da igual que peguen un post concreto: nos quedamos con el origen.
		return new URL(url.origin);
	} catch {
		throw new UnreadableError('invalid_url');
	}
}

export async function get(url: URL, accept: string): Promise<Response> {
	await assertPublicUrl(url);
	try {
		return await fetch(url, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
			headers: {
				'user-agent': BROWSER_UA,
				accept,
				'accept-language': 'es-ES,es;q=0.9,en;q=0.8'
			}
		});
	} catch (error) {
		throw new UnreadableError(
			error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'blocked'
		);
	}
}

export async function readBody(response: Response): Promise<string> {
	const reader = response.body?.getReader();
	if (!reader) return '';
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (total < MAX_BYTES) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		total += value.length;
	}
	await reader.cancel().catch(() => {});
	return new TextDecoder('utf-8').decode(
		chunks.reduce((acc, chunk) => {
			const out = new Uint8Array(acc.length + chunk.length);
			out.set(acc);
			out.set(chunk, acc.length);
			return out;
		}, new Uint8Array())
	);
}

export function decode(input: string): string {
	return input
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&');
}

/**
 * Saca el objeto de la publicación de `window._preloads`. Substack lo mete como
 * una cadena JSON escapada dentro de `JSON.parse("...")`, así que hay dos vueltas.
 */
export function preloads(html: string): Record<string, unknown> {
	const escaped = html.match(/window\._preloads\s*=\s*JSON\.parse\("((?:\\.|[^"\\])*)"\)/);
	if (escaped) {
		try {
			return JSON.parse(JSON.parse(`"${escaped[1]}"`));
		} catch {
			/* cae al siguiente intento */
		}
	}
	const plain = html.match(/window\._preloads\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
	if (plain) {
		try {
			return JSON.parse(plain[1]);
		} catch {
			/* nada que hacer */
		}
	}
	return {};
}
```

- [ ] **Step 2: Adaptar `newsletter.ts`**

Sustituye su primera línea de imports por:

```ts
import { get, readBody as body, decode, preloads, toOrigin, UnreadableError } from './substack';

// Se reexporta para que quien use este módulo no tenga que importar de substack.
export { UnreadableError };
```

Luego **borra** de `newsletter.ts` estas definiciones, que ahora viven en `substack.ts`: las constantes `TIMEOUT_MS` y `MAX_BYTES`, y las funciones `toOrigin`, `get`, `body`, `decode` y `preloads`. Deja intactos `POSTS`, `POST_BODIES`, `toPlainText`, `text`, `bool`, `num`, `count`, `meta`, `tags`, `readPosts`, `normalizeOrigin`, `collectNewsletter` y `collectPostBodies`.

- [ ] **Step 3: Comprobar que no hay errores nuevos de tipos**

Run: `pnpm check`
Expected: los **2 errores conocidos** de `demo/paraglide` y `tool/places-evaluator`, y ninguno más.

- [ ] **Step 4: Comprobar que el tool que ya existía sigue funcionando**

Run: `pnpm dev`, abre `http://localhost:5173/tool/newsletter` y evalúa `kloshletter.substack.com`.
Expected: el informe sale igual que antes del refactor. Es un refactor: cualquier diferencia es un fallo.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/substack.ts src/lib/server/newsletter.ts
git commit -m "refactor(server): extract shared Substack HTTP helpers"
```

---

### Task 4: `substack-archive.ts` — el recorrido y el fallback

**Files:**
- Modify: `src/lib/server/substack-archive.ts` (ya tiene el tipo de la Task 1)
- Test: `src/lib/server/substack-archive.test.ts`

**Interfaces:**
- Consumes: `get`, `readBody`, `decode`, `preloads` de `$lib/server/substack`; `originsForSlug` de `$lib/authors/slug`
- Produces:
  - `ArchivePost` (ya existe)
  - `PubInfo = { origin, name, authorName, createdAt, language, subscriberCount, subscriberCountLabel, logoUrl, paymentsEnabled }`
  - `readPubInfo(slug: string): Promise<PubInfo>`
  - `walkArchive(origin: string, onPage?: (readSoFar: number) => void, spacingMs?: number): Promise<{ posts: ArchivePost[]; truncated: boolean }>` — `spacingMs` existe solo para que los tests pasen 0; en producción se omite
  - `readFeed(origin: string): Promise<ArchivePost[]>`
  - `PAGE_SIZE`, `MAX_PAGES`, `SPACING_MS`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/lib/server/substack-archive.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { walkArchive, readFeed, MAX_PAGES } from './substack-archive';

// `get` es lo único que toca la red; se simula para poder probar la paginación.
vi.mock('./substack', async () => {
	const actual = await vi.importActual<typeof import('./substack')>('./substack');
	return { ...actual, get: vi.fn() };
});
const { get } = await import('./substack');

function jsonResponse(value: unknown): Response {
	return new Response(JSON.stringify(value), { status: 200 });
}

function fakePost(n: number) {
	return {
		title: `Post ${n}`,
		slug: `post-${n}`,
		post_date: new Date(Date.UTC(2026, 0, 1) + n * 86400000).toISOString(),
		audience: 'everyone',
		type: 'newsletter',
		wordcount: 1000,
		reaction_count: n,
		comment_count: 1,
		child_comment_count: 0
	};
}

afterEach(() => vi.mocked(get).mockReset());

describe('walkArchive', () => {
	it('avanza por los recibidos, no por el límite pedido', async () => {
		// Medido: offset=0 devuelve 23 como máximo aunque se pidan 50. Si el
		// recorrido avanzase de 50 en 50 se saltaría 27 posts en silencio.
		vi.mocked(get)
			.mockResolvedValueOnce(jsonResponse(Array.from({ length: 23 }, (_, i) => fakePost(i))))
			.mockResolvedValueOnce(jsonResponse(Array.from({ length: 10 }, (_, i) => fakePost(23 + i))))
			.mockResolvedValueOnce(jsonResponse([]));

		const { posts, truncated } = await walkArchive('https://x.substack.com');

		expect(posts).toHaveLength(33);
		expect(truncated).toBe(false);
		// La segunda petición tiene que pedir offset=23, no offset=50.
		expect(vi.mocked(get).mock.calls[1][0].searchParams.get('offset')).toBe('23');
	});

	it('descarta duplicados por slug', async () => {
		vi.mocked(get)
			.mockResolvedValueOnce(jsonResponse([fakePost(1), fakePost(2)]))
			.mockResolvedValueOnce(jsonResponse([fakePost(2), fakePost(3)]))
			.mockResolvedValueOnce(jsonResponse([]));

		const { posts } = await walkArchive('https://x.substack.com');
		expect(posts.map((p) => p.slug)).toEqual(['post-1', 'post-2', 'post-3']);
	});

	it('marca truncated al llegar al tope de páginas y no sigue', async () => {
		// Cada página devuelve el mismo post, así que nunca se agota: llega al tope.
		vi.mocked(get).mockResolvedValue(jsonResponse([fakePost(1)]));
		// Espaciado 0: con los 300 ms de producción esto dormiría casi 15 s.
		const { truncated } = await walkArchive('https://x.substack.com', undefined, 0);
		expect(truncated).toBe(true);
		expect(vi.mocked(get)).toHaveBeenCalledTimes(MAX_PAGES);
	});

	it('informa del progreso con lo leído hasta el momento', async () => {
		vi.mocked(get)
			.mockResolvedValueOnce(jsonResponse(Array.from({ length: 23 }, (_, i) => fakePost(i))))
			.mockResolvedValueOnce(jsonResponse([]));

		const seen: number[] = [];
		await walkArchive('https://x.substack.com', (n) => seen.push(n));
		expect(seen).toEqual([23]);
	});
});

describe('readFeed', () => {
	it('saca título y fecha del RSS y deja a cero lo que el RSS no da', async () => {
		const xml = `<rss><channel><item>
			<title><![CDATA[Un libro en cada maleta]]></title>
			<description><![CDATA[Recomendaciones de verano]]></description>
			<link>https://x.substack.com/p/un-libro</link>
			<pubDate>Fri, 31 Jul 2026 05:02:09 GMT</pubDate>
		</item></channel></rss>`;
		vi.mocked(get).mockResolvedValueOnce(new Response(xml, { status: 200 }));

		const posts = await readFeed('https://x.substack.com');

		expect(posts).toHaveLength(1);
		expect(posts[0].title).toBe('Un libro en cada maleta');
		expect(posts[0].slug).toBe('un-libro');
		expect(posts[0].date).toBe('2026-07-31T05:02:09.000Z');
		// El feed no trae nada de esto. A cero, y las métricas que dependan de
		// ello no se muestran.
		expect(posts[0].reactions).toBe(0);
		expect(posts[0].comments).toBe(0);
		expect(posts[0].words).toBe(0);
	});
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/lib/server/substack-archive.test.ts`
Expected: FAIL — `walkArchive` no está exportado.

- [ ] **Step 3: Implementar**

Añade a `src/lib/server/substack-archive.ts`, debajo del tipo `ArchivePost`:

```ts
import { get, readBody, decode, preloads, UnreadableError } from './substack';
import { originsForSlug } from '$lib/authors/slug';

export { UnreadableError };

/**
 * El archivo completo de una publicación de Substack, y el plan B si no se deja.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LO QUE SE MIDIÓ ANTES DE ESCRIBIR ESTO (3 de agosto de 2026)
 *
 *  - `limit` máximo es **50**. Con 100 responde 400 «Invalid value».
 *  - **`offset=0` devuelve 23 posts como máximo**, se pida el límite que se
 *    pida. Con `offset=1` devuelve 50. Pasa igual en tres publicaciones
 *    distintas, así que es de la plataforma y no de una.
 *    Por eso el recorrido avanza con `offset += recibidos.length` y NO
 *    `offset += PAGE_SIZE`: avanzando de 50 en 50 se saltan 27 posts en la
 *    primera vuelta, sin error y sin que se note.
 *  - El archivo llega hasta el final de verdad: 1330 posts en 29 peticiones
 *    en www.honest-broker.com, sin un duplicado.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** El máximo que acepta el endpoint. Más devuelve 400. */
export const PAGE_SIZE = 50;
/**
 * Tope de peticiones por publicación. El archivo más profundo que se midió
 * gastó 29, así que sobra margen; esto solo evita que un archivo enorme cuelgue
 * la función. Si se toca, la tarjeta lo DICE en vez de fingir que ese es todo
 * el archivo.
 */
export const MAX_PAGES = 50;
/**
 * Espera entre páginas. Es el servidor de otra persona y no ha pedido esto:
 * secuencial y espaciado. En paralelo iría más rápido y sería martillearlo.
 */
export const SPACING_MS = 300;

export type PubInfo = {
	/** El origen que de verdad respondió. */
	origin: string;
	name: string;
	authorName: string;
	/**
	 * La fecha fiable. `first_post_date` MIENTE: se midió `2000-01-01` en The
	 * Honest Broker y `2011-06-28` en liderar, las dos de archivos importados.
	 */
	createdAt: string;
	language: string;
	/**
	 * Suscriptores, **solo si la publicación los enseña en su portada**.
	 *
	 * `freeSubscriberCount` llega en el payload esté visible o no, y el ajuste
	 * que decide si se muestra NO viene como clave (ver el comentario de
	 * `newsletter.ts`). Así que no se lee del payload a secas: se comprueba si el
	 * número está renderizado en el texto visible de la portada, que es la única
	 * prueba de que su autor quiere que se vea.
	 *
	 * Medido: las tres publicaciones de referencia lo enseñan como "Over 7,000
	 * subscribers", "Over 297,000 subscribers" y "Over 2,000 subscribers", así
	 * que el caso positivo está confirmado 3 de 3. Si no aparece, esto es `null`
	 * y la tarjeta **no dice nada** de suscriptores: ni el número, ni una
	 * etiqueta vaga, ni "no disponible".
	 */
	subscriberCount: number | null;
	logoUrl: string | null;
	paymentsEnabled: boolean;
};

function text(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

/** Substack da los suscriptores ya formateados ("297,000"). */
function count(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value !== 'string') return null;
	const digits = value.replace(/[^\d]/g, '');
	return digits ? Number(digits) : null;
}

/** El texto que de verdad se ve en la portada, sin scripts ni etiquetas. */
function visibleText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ');
}

/**
 * Los suscriptores solo si la publicación los enseña.
 *
 * El payload trae el número esté visible o no, así que la única prueba de que su
 * autor quiere que se vea es que esté escrito en la portada. Se buscan las
 * formas en que Substack lo escribe: tal cual viene ("7,000"), sin separador
 * ("7000") y abreviado ("7K", "7.0K").
 *
 * Medido: las tres publicaciones de referencia lo renderizan como "Over N
 * subscribers", así que el caso positivo está confirmado 3 de 3. No se encontró
 * una publicación que lo oculte, así que la rama negativa no está comprobada
 * contra la realidad: es una detección directa, no una inferencia, pero conviene
 * saberlo.
 */
function shownSubscriberCount(html: string, raw: unknown): number | null {
	const parsed = count(raw);
	if (parsed === null) return null;
	const text = visibleText(html);
	const forms = [
		typeof raw === 'string' ? raw : '',
		String(parsed),
		parsed.toLocaleString('en-US'),
		parsed >= 1000 ? `${Math.floor(parsed / 1000)}K` : '',
		parsed >= 1000 ? `${(parsed / 1000).toFixed(1)}K` : ''
	].filter(Boolean);
	return forms.some((form) => text.includes(form)) ? parsed : null;
}

function readArchivePost(raw: unknown): ArchivePost | null {
	if (!raw || typeof raw !== 'object') return null;
	const p = raw as Record<string, unknown>;
	const title = text(p.title);
	if (!title) return null;
	const n = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
	return {
		title,
		subtitle: text(p.subtitle),
		slug: text(p.slug),
		date: text(p.post_date),
		audience: text(p.audience) || 'everyone',
		type: text(p.type) || 'newsletter',
		words: n(p.wordcount),
		reactions: n(p.reaction_count),
		comments: n(p.comment_count),
		childComments: n(p.child_comment_count),
		sectionName: text(p.section_name)
	};
}

/**
 * Los metadatos de la publicación: una sola petición, barata.
 *
 * Va aparte del recorrido a propósito. La página necesita el nombre y el autor
 * para pintar la cabecera y las etiquetas `og:` YA, sin esperar los 20 s que
 * puede tardar un archivo profundo. Un rastreador de redes nunca llega a pagar
 * el recorrido.
 *
 * Prueba los orígenes que da `originsForSlug` y se queda con el primero que
 * responda: medido, `honest-broker.com` a secas devuelve 404 y solo contesta
 * `www.honest-broker.com`.
 */
export async function readPubInfo(slug: string): Promise<PubInfo> {
	const candidates = originsForSlug(slug);
	if (!candidates.length) throw new UnreadableError('invalid_url');

	let lastError: unknown = null;
	for (const origin of candidates) {
		let html: string;
		try {
			const response = await get(new URL(origin), 'text/html');
			if (response.status === 404) {
				lastError = new UnreadableError('not_found');
				continue;
			}
			if (!response.ok) {
				lastError = new UnreadableError('blocked');
				continue;
			}
			html = await readBody(response);
		} catch (error) {
			lastError = error;
			continue;
		}

		const root = preloads(html);
		const pub = (root.pub ?? {}) as Record<string, unknown>;
		// Sin objeto de publicación no es un Substack. Medido: platformer.news
		// responde 200 y no trae `pub`.
		if (!pub.name) {
			lastError = new UnreadableError('empty');
			continue;
		}

		return {
			// El origen efectivo, que puede no ser el que se pidió por un 301.
			origin: origin.replace(/\/$/, ''),
			name: decode(text(pub.name)).trim(),
			authorName: decode(text(pub.author_name)).trim(),
			createdAt: text(pub.created_at),
			language: text(pub.language) || 'es',
			// Solo si está renderizado en la portada. Ver `shownSubscriberCount`.
			subscriberCount: shownSubscriberCount(html, pub.freeSubscriberCount),
			logoUrl: text(pub.logo_url) || null,
			paymentsEnabled: text(pub.payments_state) === 'enabled'
		};
	}
	throw lastError instanceof UnreadableError ? lastError : new UnreadableError('blocked');
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Recorre el archivo hasta agotarlo.
 *
 * `onPage` recibe cuántos posts hay leídos hasta ese momento. NO recibe un
 * total: la API no lo da, así que un denominador sería un número inventado.
 */
export async function walkArchive(
	origin: string,
	onPage?: (readSoFar: number) => void,
	/**
	 * Espera entre páginas. Es parámetro y no constante fija SOLO para que los
	 * tests puedan pasar 0: el test que comprueba el tope de 50 páginas
	 * dormiría 49 × 300 ms = casi 15 s y se pasaría del timeout de vitest.
	 * En producción nunca se pasa: se usa el valor de arriba.
	 */
	spacingMs = SPACING_MS
): Promise<{ posts: ArchivePost[]; truncated: boolean }> {
	const posts: ArchivePost[] = [];
	const seen = new Set<string>();
	let offset = 0;

	for (let page = 0; page < MAX_PAGES; page++) {
		if (page > 0) await sleep(spacingMs);

		const url = new URL('/api/v1/archive', origin);
		url.searchParams.set('sort', 'new');
		url.searchParams.set('limit', String(PAGE_SIZE));
		url.searchParams.set('offset', String(offset));

		const response = await get(url, 'application/json');
		if (!response.ok) throw new UnreadableError('blocked');

		let batch: unknown;
		try {
			batch = JSON.parse(await readBody(response));
		} catch {
			throw new UnreadableError('blocked');
		}
		// Cuando se pasa un `limit` inválido responde un objeto con `errors`.
		if (!Array.isArray(batch)) throw new UnreadableError('blocked');
		if (batch.length === 0) return { posts, truncated: false };

		for (const raw of batch) {
			const post = readArchivePost(raw);
			if (!post || seen.has(post.slug)) continue;
			seen.add(post.slug);
			posts.push(post);
		}

		// Por los recibidos, no por PAGE_SIZE. Ver el comentario de cabecera.
		offset += batch.length;
		onPage?.(posts.length);
	}

	return { posts, truncated: true };
}

/**
 * El plan B: el RSS.
 *
 * Trae 20 items y solo `title`, `description`, `link`, `pubDate` y
 * `dc:creator`. **Ni likes, ni comentarios, ni gratis/pago, ni palabras.** Se
 * comprobó buscando esos campos en el feed entero. Lo que no viene se queda a
 * cero y las métricas que dependen de ello no se muestran; no se estima nada.
 */
export async function readFeed(origin: string): Promise<ArchivePost[]> {
	const response = await get(new URL('/feed', origin), 'application/rss+xml');
	if (!response.ok) throw new UnreadableError('blocked');
	const xml = await readBody(response);

	const cdata = (value: string) =>
		decode(value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')).trim();
	const tag = (chunk: string, name: string) => {
		const match = chunk.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
		return match ? cdata(match[1]) : '';
	};

	const posts: ArchivePost[] = [];
	for (const chunk of xml.split('<item>').slice(1)) {
		// `content:encoded` trae el cuerpo entero y se traga cualquier regex.
		const head = chunk.split('<content:encoded>')[0];
		const title = tag(head, 'title');
		const pubDate = tag(head, 'pubDate');
		const parsed = pubDate ? new Date(pubDate) : null;
		if (!title || !parsed || Number.isNaN(parsed.getTime())) continue;

		posts.push({
			title,
			subtitle: tag(head, 'description'),
			slug: tag(head, 'link').split('/p/')[1]?.split(/[?#]/)[0] ?? '',
			date: parsed.toISOString(),
			audience: 'everyone',
			type: 'newsletter',
			words: 0,
			reactions: 0,
			comments: 0,
			childComments: 0,
			sectionName: ''
		});
	}
	if (!posts.length) throw new UnreadableError('empty');
	return posts;
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `pnpm vitest run src/lib/server/substack-archive.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Verificar contra la realidad, no solo contra los mocks**

Crea un script temporal fuera del repo y ejecútalo con `node`, o comprueba con `curl`:

```bash
curl -s -A "Mozilla/5.0 Chrome/120" "https://kloshletter.substack.com/api/v1/archive?sort=new&limit=50&offset=0" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('offset=0 devuelve',JSON.parse(s).length,'posts'))"
```

Expected: `offset=0 devuelve 23 posts`. Si devolviera 50, la premisa del recorrido cambió y hay que volver a medir antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/substack-archive.ts src/lib/server/substack-archive.test.ts
git commit -m "feat(server): walk the Substack archive with an RSS fallback"
```

---

### Task 5: `metrics.ts` (1/2) — conjuntos, rankings y forma temporal

**Files:**
- Create: `src/lib/authors/metrics.ts`
- Test: `src/lib/authors/metrics.test.ts`

**Interfaces:**
- Consumes: `ArchivePost` de `$lib/server/substack-archive`; fixtures de `$lib/authors/fixtures`
- Produces: `ownPosts`, `datedPosts`, `weekIndex`, `longestStreak`, `currentStreak`, `postsByYear`, `topDay`, `freePaid`, `topPost`, y las constantes `MIN_POSTS`, `DAY_MIN_SHARE`, `PAID_MIN_SHARE`

- [ ] **Step 1: Escribir el test que falla**

Crea `src/lib/authors/metrics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deepFixture, youngFixture, DEEP_CREATED_AT } from './fixtures';
import {
	ownPosts,
	datedPosts,
	longestStreak,
	currentStreak,
	postsByYear,
	topDay,
	freePaid,
	topPost
} from './metrics';

const deep = deepFixture();

describe('conjuntos', () => {
	it('los propios excluyen el restack y conservan el podcast', () => {
		const own = ownPosts(deep);
		expect(own.some((p) => p.type === 'restack')).toBe(false);
		// Un podcast es obra suya: cuenta.
		expect(own.some((p) => p.type === 'podcast')).toBe(true);
	});

	it('los fechados tiran lo anterior a created_at', () => {
		const dated = datedPosts(deep, DEEP_CREATED_AT);
		expect(dated.some((p) => p.date.startsWith('2000-01-01'))).toBe(false);
		expect(dated.some((p) => p.date.startsWith('2011'))).toBe(false);
		expect(dated.every((p) => p.date >= DEEP_CREATED_AT)).toBe(true);
	});
});

describe('rankings', () => {
	it('el techo se busca en TODO el archivo, sin filtrar por fecha', () => {
		// Los likes se acumulan en Substack sea cual sea la fecha declarada del
		// post, así que un importado puede ser legítimamente el más gustado.
		const top = topPost(deep, 'reactions');
		expect(top?.post.reactions).toBe(8854);
		expect(top?.post.title).toBe('El techo de la casa');
	});

	it('no enseña la fecha de un post anterior a created_at', () => {
		const posts = [
			{ ...deep[0], date: '2000-01-01T17:00:00.000Z', reactions: 500, title: 'Importado' }
		];
		// El suelo hay que pasarlo: sin él no se puede saber que la fecha es basura.
		const top = topPost(posts, 'reactions', DEEP_CREATED_AT);
		// No vamos a firmar "18 de febrero de 2000".
		expect(top?.showDate).toBe(false);
	});

	it('no hay techo si nadie ha reaccionado', () => {
		const posts = deep.map((p) => ({ ...p, reactions: 0 }));
		expect(topPost(posts, 'reactions')).toBe(null);
	});
});

describe('rachas', () => {
	it('cuenta semanas ISO consecutivas', () => {
		const dated = datedPosts(deep, DEEP_CREATED_AT);
		// El fixture tiene 30 semanas seguidas, un salto de 3 y otras 10.
		expect(longestStreak(dated)).toBe(30);
	});

	it('la racha actual mide desde la última semana con post', () => {
		const posts = youngFixture();
		expect(currentStreak(posts, new Date(posts[posts.length - 1].date))).toBe(6);
	});

	it('la racha actual es cero si la última semana quedó atrás', () => {
		const posts = youngFixture();
		const muchoDespues = new Date(new Date(posts[posts.length - 1].date).getTime() + 60 * 86400000);
		expect(currentStreak(posts, muchoDespues)).toBe(0);
	});
});

describe('cadencia', () => {
	it('divide por los meses activos y marca el año en curso', () => {
		const dated = datedPosts(deep, DEEP_CREATED_AT);
		const years = postsByYear(dated, new Date('2024-12-31T00:00:00.000Z'));
		const y2024 = years.find((y) => y.year === 2024);
		expect(y2024?.posts).toBe(42);
		// 2024 es el año de "hoy" en esta llamada, así que va etiquetado.
		expect(y2024?.inProgress).toBe(true);
	});
});

describe('umbrales condicionales', () => {
	it('el día solo sale si domina de verdad', () => {
		// Todo el fixture profundo publica en lunes: 100%.
		expect(topDay(datedPosts(deep, DEEP_CREATED_AT))?.weekday).toBe(1);

		// Reparto plano entre siete días: es ruido, no sale.
		const plano = Array.from({ length: 70 }, (_, i) => ({
			...deep[3],
			slug: `p-${i}`,
			date: new Date(Date.UTC(2025, 0, 6) + i * 86400000).toISOString()
		}));
		expect(topDay(plano)).toBe(null);
	});

	it('el ratio gratis/pago solo sale si hay mezcla real', () => {
		const dated = datedPosts(deep, DEEP_CREATED_AT);
		expect(freePaid(dated)).not.toBe(null);

		// 281 de 281 gratis, como liderar: "100% gratis" no es una métrica.
		const todoGratis = dated.map((p) => ({ ...p, audience: 'everyone' }));
		expect(freePaid(todoGratis)).toBe(null);
	});
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/lib/authors/metrics.test.ts`
Expected: FAIL — no existe `./metrics`.

- [ ] **Step 3: Implementar**

Crea `src/lib/authors/metrics.ts`:

```ts
import type { ArchivePost } from '$lib/server/substack-archive';

/**
 * De posts a métricas. Funciones puras: aquí no se pide nada por red.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ HAY TRES CONJUNTOS Y NO UN FILTRO
 *
 * Un filtro único se rompe en las dos direcciones, y las dos se midieron:
 *
 *   - Sin filtrar, la racha de The Honest Broker empieza en el año 2000, porque
 *     **435 de sus 1330 posts están fechados `2000-01-01`**: un archivo de
 *     reseñas importado. Y aparecen huecos de silencio que nunca existieron.
 *   - Filtrando todo por `created_at`, se tiran 435 posts REALES que tienen sus
 *     likes y sus comentarios de verdad.
 *
 * Así que:
 *   `ownPosts`   — todo lo que no sea de otra persona. Para los rankings.
 *   `datedPosts` — además, con fecha posterior a `created_at`. Para todo lo que
 *                  tenga forma temporal: rachas, cadencia, día, hora.
 *
 * El suelo es `created_at` y NUNCA `first_post_date`, que miente: se midió
 * `2000-01-01` en The Honest Broker y `2011-06-28` en liderar.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Con menos de esto no hay tarjeta: una llena de unos no es un regalo. */
export const MIN_POSTS = 5;
/**
 * Cuánto tiene que pesar el día top para que sea un dato y no ruido.
 *
 * Medido: el día top de The Honest Broker es 17% y el de liderar 18%, cuando el
 * reparto plano entre siete días ya da 14,3%. Eso no es "su día". Un autor
 * semanal que publica siempre el mismo día sale por encima del 80%.
 */
export const DAY_MIN_SHARE = 0.4;
/**
 * Mínimo del lado menor para que el ratio gratis/pago diga algo.
 *
 * Medido: liderar es 281 de 281 gratis. "100% gratis" es la ausencia de una
 * métrica, no una métrica.
 */
export const PAID_MIN_SHARE = 0.05;

const WEEK_MS = 7 * 86400000;

/** Todo lo que sea obra suya. Un `restack` es el post de OTRA persona. */
export function ownPosts(posts: ArchivePost[]): ArchivePost[] {
	return posts.filter((p) => p.type !== 'restack' && p.date);
}

/** Los suyos con fecha fiable: de `created_at` en adelante. */
export function datedPosts(posts: ArchivePost[], createdAt: string): ArchivePost[] {
	const floor = createdAt || '';
	return ownPosts(posts)
		.filter((p) => !floor || p.date >= floor)
		.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Índice absoluto de semana ISO.
 *
 * Absoluto y no "año + número de semana" para que dos semanas consecutivas a
 * caballo entre diciembre y enero salgan consecutivas. Se normaliza al jueves
 * de su semana ISO, que es la definición.
 */
export function weekIndex(date: Date): number {
	const t = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const day = t.getUTCDay() || 7;
	t.setUTCDate(t.getUTCDate() + 4 - day);
	return Math.floor(t.getTime() / WEEK_MS);
}

function activeWeeks(posts: ArchivePost[]): number[] {
	return [...new Set(posts.map((p) => weekIndex(new Date(p.date))))].sort((a, b) => a - b);
}

/** La racha más larga de semanas seguidas publicando. */
export function longestStreak(posts: ArchivePost[]): number {
	const weeks = activeWeeks(posts);
	if (!weeks.length) return 0;
	let best = 1;
	let run = 1;
	for (let i = 1; i < weeks.length; i++) {
		run = weeks[i] === weeks[i - 1] + 1 ? run + 1 : 1;
		if (run > best) best = run;
	}
	return best;
}

/**
 * La racha que sigue viva.
 *
 * Cero si la última semana con post no es esta ni la anterior: se da una semana
 * de gracia porque alguien que publica los viernes no ha roto nada el lunes.
 */
export function currentStreak(posts: ArchivePost[], now: Date): number {
	const weeks = activeWeeks(posts);
	if (!weeks.length) return 0;
	const last = weeks[weeks.length - 1];
	if (weekIndex(now) - last > 1) return 0;

	const active = new Set(weeks);
	let run = 0;
	for (let w = last; active.has(w); w--) run++;
	return run;
}

export type YearCadence = {
	year: number;
	posts: number;
	monthsActive: number;
	/** Posts por mes activo, con un decimal. */
	perMonth: number;
	/** El año de hoy siempre se ve corto. Sin esta etiqueta, la barra miente. */
	inProgress: boolean;
};

export function postsByYear(posts: ArchivePost[], now: Date): YearCadence[] {
	const years = new Map<number, Set<string>>();
	const counts = new Map<number, number>();
	for (const p of posts) {
		const year = Number(p.date.slice(0, 4));
		counts.set(year, (counts.get(year) ?? 0) + 1);
		if (!years.has(year)) years.set(year, new Set());
		years.get(year)!.add(p.date.slice(5, 7));
	}
	return [...counts.keys()]
		.sort((a, b) => a - b)
		.map((year) => {
			const monthsActive = years.get(year)!.size;
			return {
				year,
				posts: counts.get(year)!,
				monthsActive,
				perMonth: Math.round((counts.get(year)! / monthsActive) * 10) / 10,
				inProgress: year === now.getUTCFullYear()
			};
		});
}

export type TopDay = { weekday: number; posts: number; share: number };

/**
 * El día de la semana, **solo si domina**. `null` si es ruido.
 *
 * Se calcula en UTC. Un autor que publica a las 20:00 en Nueva York cae en el
 * día siguiente en UTC; la página lo dice en vez de disimularlo.
 */
export function topDay(posts: ArchivePost[]): TopDay | null {
	if (posts.length < MIN_POSTS) return null;
	const counts = new Map<number, number>();
	for (const p of posts) {
		const day = new Date(p.date).getUTCDay();
		counts.set(day, (counts.get(day) ?? 0) + 1);
	}
	const [weekday, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
	const share = count / posts.length;
	return share >= DAY_MIN_SHARE ? { weekday, posts: count, share } : null;
}

export type FreePaid = { free: number; paid: number; freeShare: number };

/** El reparto gratis/pago, solo si hay mezcla de verdad. */
export function freePaid(posts: ArchivePost[]): FreePaid | null {
	if (!posts.length) return null;
	const free = posts.filter((p) => p.audience === 'everyone').length;
	const paid = posts.length - free;
	const minor = Math.min(free, paid) / posts.length;
	if (minor < PAID_MIN_SHARE) return null;
	return { free, paid, freeShare: free / posts.length };
}

export type TopPost = {
	post: ArchivePost;
	/**
	 * Si la fecha es anterior a `created_at` es de una importación y no se
	 * enseña: no vamos a firmar un "18 de febrero de 2000".
	 */
	showDate: boolean;
};

/** El techo de una métrica en TODO el archivo propio. `null` si el máximo es 0. */
export function topPost(
	posts: ArchivePost[],
	key: 'reactions' | 'comments' | 'words',
	createdAt = ''
): TopPost | null {
	const own = ownPosts(posts);
	if (!own.length) return null;
	const best = own.reduce((a, b) => (b[key] > a[key] ? b : a));
	if (best[key] <= 0) return null;
	return { post: best, showDate: !createdAt || best.date >= createdAt };
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `pnpm vitest run src/lib/authors/metrics.test.ts`
Expected: PASS, 11 tests. Si `postsByYear` falla por el número 42, cuenta los posts de 2024 del fixture y ajusta el **test** al fixture, no la fórmula.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authors/metrics.ts src/lib/authors/metrics.test.ts
git commit -m "feat(author): compute post sets, streaks, cadence and records"
```

---

### Task 6: `metrics.ts` (2/2) — titulares, agregados y el resumen completo

**Files:**
- Modify: `src/lib/authors/metrics.ts`
- Modify: `src/lib/authors/metrics.test.ts`

**Interfaces:**
- Consumes: todo lo de la Task 5
- Produces: `topWords`, `headlineStats`, `topHour`, `aggregates`, `heatmapRows`, `computeMetrics(posts, pub, now): Metrics | null`, tipo `Metrics`, constantes `WORD_MIN_POSTS`, `HOUR_MIN_SHARE`, `SIGNATURE_MIN_SHARE`, `WORDS_PER_NOVEL`

- [ ] **Step 1: Escribir los tests que fallan**

Añade al final de `src/lib/authors/metrics.test.ts`:

```ts
import {
	topWords,
	headlineStats,
	topHour,
	aggregates,
	heatmapRows,
	computeMetrics,
	WORDS_PER_NOVEL
} from './metrics';
import { tinyFixture } from './fixtures';

const PUB = {
	origin: 'https://x.substack.com',
	name: 'La publicación',
	authorName: 'Alguien',
	createdAt: DEEP_CREATED_AT,
	language: 'es',
	subscriberCount: 7000,
	subscriberCountLabel: 'thousands of subscribers',
	logoUrl: null,
	paymentsEnabled: true
};

describe('titulares', () => {
	it('cuenta las palabras que repite y salta las vacías', () => {
		const posts = [
			{ ...deep[3], slug: 'a', title: 'El liderazgo y la negociación' },
			{ ...deep[3], slug: 'b', title: 'Liderazgo para todos' },
			{ ...deep[3], slug: 'c', title: 'Más liderazgo, por favor' },
			{ ...deep[3], slug: 'd', title: 'Otra cosa distinta' }
		];
		const words = topWords(posts);
		expect(words[0]).toEqual({ word: 'liderazgo', posts: 3 });
		// "el", "la", "y", "para", "por" son de relleno y no cuentan.
		expect(words.some((w) => ['el', 'la', 'para', 'por'].includes(w.word))).toBe(false);
	});

	it('agrupa las variantes con y sin acento pero enseña la forma más usada', () => {
		const posts = [
			{ ...deep[3], slug: 'a', title: 'Negociación dura' },
			{ ...deep[3], slug: 'b', title: 'Negociación blanda' },
			{ ...deep[3], slug: 'c', title: 'Negociacion sin tilde' }
		];
		expect(topWords(posts)[0]).toEqual({ word: 'negociación', posts: 3 });
	});

	it('no devuelve una palabra que solo sale en dos posts', () => {
		const posts = [
			{ ...deep[3], slug: 'a', title: 'Liderazgo uno' },
			{ ...deep[3], slug: 'b', title: 'Liderazgo dos' }
		];
		expect(topWords(posts)).toEqual([]);
	});

	it('el tic del titular solo sale si pasa del umbral', () => {
		const conDosPuntos = Array.from({ length: 10 }, (_, i) => ({
			...deep[3],
			slug: `p-${i}`,
			title: i < 3 ? `Tema ${i}: lo que sea` : `Titular normal ${i}`
		}));
		// 3 de 10 son dos puntos: 30%, pasa del 20%.
		expect(headlineStats(conDosPuntos).signature).toEqual({ kind: 'colon', share: 0.3, posts: 3 });

		const sinNada = Array.from({ length: 10 }, (_, i) => ({
			...deep[3],
			slug: `q-${i}`,
			title: `Titular ${'x'.repeat(i)}`
		}));
		expect(sinNada.length).toBe(10);
		expect(headlineStats(sinNada).signature).toBe(null);
	});

	it('da la longitud media del titular', () => {
		const posts = [
			{ ...deep[3], slug: 'a', title: 'abcd' },
			{ ...deep[3], slug: 'b', title: 'abcdef' }
		];
		expect(headlineStats(posts).averageLength).toBe(5);
	});
});

describe('hora del día', () => {
	it('sale cuando se concentra en una franja', () => {
		// Medido en Kloshletter: 49% a las 05h y 44% a las 06h.
		const posts = Array.from({ length: 100 }, (_, i) => ({
			...deep[3],
			slug: `p-${i}`,
			date: `2026-0${(i % 9) + 1}-01T0${i < 50 ? 5 : 6}:00:00.000Z`
		}));
		expect(topHour(posts)?.hour).toBe(5);
	});

	it('no sale cuando está repartida', () => {
		const posts = Array.from({ length: 48 }, (_, i) => ({
			...deep[3],
			slug: `p-${i}`,
			date: `2026-01-01T${String(i % 24).padStart(2, '0')}:00:00.000Z`
		}));
		expect(topHour(posts)).toBe(null);
	});
});

describe('agregados', () => {
	it('suma lo que Substack solo enseña post a post', () => {
		const posts = [
			{ ...deep[3], slug: 'a', words: 1000, reactions: 10, comments: 2, childComments: 1 },
			{ ...deep[3], slug: 'b', words: 500, reactions: 5, comments: 3, childComments: 4 }
		];
		const agg = aggregates(posts);
		expect(agg.words).toBe(1500);
		expect(agg.reactions).toBe(15);
		// Comentarios y respuestas van sumados: es la conversación total.
		expect(agg.conversation).toBe(10);
		expect(agg.novels).toBe(Math.round((1500 / WORDS_PER_NOVEL) * 10) / 10);
	});

	it('no da equivalencia en libros si no hay palabras (caso RSS)', () => {
		const posts = [{ ...deep[3], slug: 'a', words: 0 }];
		expect(aggregates(posts).novels).toBe(null);
	});
});

describe('mapa de calor', () => {
	it('da una fila por año con una casilla por semana', () => {
		const rows = heatmapRows(datedPosts(deep, DEEP_CREATED_AT));
		expect(rows[0].year).toBe(2024);
		expect(rows[0].weeks).toHaveLength(53);
		expect(rows[0].weeks.filter(Boolean).length).toBeGreaterThan(30);
	});
});

describe('computeMetrics', () => {
	it('devuelve null por debajo del mínimo', () => {
		expect(computeMetrics(tinyFixture(), PUB, new Date('2026-08-03T00:00:00.000Z'))).toBe(null);
	});

	it('monta el resumen completo del archivo profundo', () => {
		const m = computeMetrics(deep, PUB, new Date('2024-12-31T00:00:00.000Z'));
		expect(m).not.toBe(null);
		expect(m!.totalPosts).toBe(42);
		expect(m!.longestStreak).toBe(30);
		expect(m!.mostLiked?.post.reactions).toBe(8854);
		expect(m!.aggregates.words).toBeGreaterThan(0);
		expect(m!.years.length).toBe(1);
	});
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/lib/authors/metrics.test.ts`
Expected: FAIL — `topWords` no está exportado.

- [ ] **Step 3: Implementar**

Añade al final de `src/lib/authors/metrics.ts`:

```ts
import type { PubInfo } from '$lib/server/substack-archive';

/** Una palabra tiene que salir en tres titulares para ser "una palabra suya". */
export const WORD_MIN_POSTS = 3;
/** Concentración mínima en una franja de tres horas para que la hora sea un dato. */
export const HOUR_MIN_SHARE = 0.5;
/** Peso mínimo de un tic del titular (pregunta, número, dos puntos). */
export const SIGNATURE_MIN_SHARE = 0.2;
/**
 * El divisor de la equivalencia en libros.
 *
 * Es una COMPARACIÓN, no un dato de Substack, así que la página **enseña este
 * número siempre**. Sin el divisor a la vista sería una estimación disfrazada
 * de hecho, que es justo lo que no hacemos.
 */
export const WORDS_PER_NOVEL = 80_000;

/**
 * Palabras de relleno de los DOS idiomas a la vez, siempre.
 *
 * Las publicaciones vienen en español y en inglés (medido: `language` es 'es' en
 * dos de las tres de referencia y 'en' en la otra), pero la lista no se elige
 * por idioma a propósito: los titulares mezclan, y una lista solo española
 * dejaría pasar "the" en un titular en inglés. Por eso `topWords` no recibe el
 * idioma — no lo necesitaría para nada.
 */
const STOPWORDS = new Set(
	`el la los las un una unos unas de del al a y o u que en por para con sin sobre entre es son ser
	 su sus lo le les mi tu se me te no ni como mas muy ya pero si cuando donde quien esta este esto
	 the of and to in for is on it this that you your we i my what how why when a an be are was as at
	 from or not with by`
		.split(/\s+/)
		.filter(Boolean)
);

/** Sin tildes y en minúsculas, para agrupar variantes de la misma palabra. */
function fold(word: string): string {
	return word
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

export type TopWord = { word: string; posts: number };

/**
 * Las palabras que más repite en sus titulares.
 *
 * Cuenta **posts, no apariciones**: una palabra repetida cuatro veces en un solo
 * titular no es un tema suyo, es una anáfora.
 *
 * Se agrupa sin tildes para que "negociación" y "negociacion" sean la misma, y
 * se devuelve la forma que más usa, no la plegada: en la tarjeta va escrita
 * como la escribe él.
 */
export function topWords(posts: ArchivePost[], limit = 5): TopWord[] {
	const postsPerWord = new Map<string, number>();
	const forms = new Map<string, Map<string, number>>();

	for (const post of posts) {
		const seen = new Set<string>();
		for (const raw of post.title.match(/[\p{L}\p{N}]+/gu) ?? []) {
			const folded = fold(raw);
			if (folded.length < 4 || STOPWORDS.has(folded)) continue;
			if (!forms.has(folded)) forms.set(folded, new Map());
			const shapes = forms.get(folded)!;
			shapes.set(raw.toLowerCase(), (shapes.get(raw.toLowerCase()) ?? 0) + 1);
			if (seen.has(folded)) continue;
			seen.add(folded);
			postsPerWord.set(folded, (postsPerWord.get(folded) ?? 0) + 1);
		}
	}

	return [...postsPerWord.entries()]
		.filter(([, count]) => count >= WORD_MIN_POSTS)
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, limit)
		.map(([folded, count]) => {
			const shapes = [...forms.get(folded)!.entries()].sort((a, b) => b[1] - a[1]);
			return { word: shapes[0][0], posts: count };
		});
}

export type HeadlineSignature = { kind: 'question' | 'number' | 'colon'; share: number; posts: number };
export type HeadlineStats = {
	/** Dato menor: no halaga ni sitúa a nadie, pero se pidió. */
	averageLength: number;
	signature: HeadlineSignature | null;
};

/**
 * La forma de sus titulares.
 *
 * Medido, y por eso lleva umbral: las preguntas son el 16% en dos publicaciones
 * distintas y el 0% en la tercera; los dos puntos, el 27% en liderar y el 4% en
 * The Honest Broker. Solo se enseña el tic dominante, y solo si pesa.
 */
export function headlineStats(posts: ArchivePost[]): HeadlineStats {
	const total = posts.length;
	const averageLength = total
		? Math.round(posts.reduce((sum, p) => sum + p.title.length, 0) / total)
		: 0;
	if (!total) return { averageLength, signature: null };

	const counts: Record<HeadlineSignature['kind'], number> = {
		question: posts.filter((p) => p.title.includes('?')).length,
		number: posts.filter((p) => /\d/.test(p.title)).length,
		colon: posts.filter((p) => p.title.includes(':')).length
	};
	const [kind, count] = (Object.entries(counts) as [HeadlineSignature['kind'], number][]).sort(
		(a, b) => b[1] - a[1]
	)[0];
	const share = count / total;
	return {
		averageLength,
		signature:
			share >= SIGNATURE_MIN_SHARE
				? { kind, share: Math.round(share * 100) / 100, posts: count }
				: null
	};
}

export type TopHour = { hour: number; share: number };

/**
 * La hora a la que publica, en franja de tres horas, y solo si se concentra.
 *
 * Medido: Kloshletter tiene el 93% entre las 05h y las 06h UTC —eso es una
 * firma— y liderar reparte su máximo en el 10% —eso es nada.
 *
 * Es UTC. La página lo dice; ver el comentario de `topDay`.
 */
export function topHour(posts: ArchivePost[]): TopHour | null {
	if (posts.length < MIN_POSTS) return null;
	const byHour = new Array(24).fill(0);
	for (const p of posts) byHour[new Date(p.date).getUTCHours()]++;

	let best = { hour: 0, count: -1 };
	for (let h = 0; h < 24; h++) {
		// Ventana de tres horas centrada en h, dando la vuelta a medianoche.
		const window = byHour[(h + 23) % 24] + byHour[h] + byHour[(h + 1) % 24];
		if (window > best.count) best = { hour: h, count: window };
	}
	const share = best.count / posts.length;
	return share >= HOUR_MIN_SHARE ? { hour: best.hour, share: Math.round(share * 100) / 100 } : null;
}

export type Aggregates = {
	words: number;
	reactions: number;
	/** Comentarios y respuestas sumados: la conversación entera. */
	conversation: number;
	/** `null` cuando no hay palabras, que es lo que pasa viniendo del RSS. */
	novels: number | null;
};

/**
 * Las sumas que Substack solo enseña post a post.
 *
 * Es la mejor estadística de halago que dan estos datos, y sale limpia:
 * `wordcount` está presente en 868/868, 128/128 y 167/167 posts de las tres
 * publicaciones de referencia, sin un solo cero.
 */
export function aggregates(posts: ArchivePost[]): Aggregates {
	const words = posts.reduce((sum, p) => sum + p.words, 0);
	return {
		words,
		reactions: posts.reduce((sum, p) => sum + p.reactions, 0),
		conversation: posts.reduce((sum, p) => sum + p.comments + p.childComments, 0),
		novels: words > 0 ? Math.round((words / WORDS_PER_NOVEL) * 10) / 10 : null
	};
}

export type HeatmapRow = { year: number; weeks: boolean[] };

/** Una fila por año, 53 casillas, true donde hubo al menos un post. */
export function heatmapRows(posts: ArchivePost[]): HeatmapRow[] {
	const years = new Map<number, boolean[]>();
	for (const p of posts) {
		const date = new Date(p.date);
		const year = date.getUTCFullYear();
		if (!years.has(year)) years.set(year, new Array(53).fill(false));
		// Semana del año a partir del índice absoluto, para que cuadre con la racha.
		const first = weekIndex(new Date(Date.UTC(year, 0, 4)));
		const slot = weekIndex(date) - first;
		if (slot >= 0 && slot < 53) years.get(year)![slot] = true;
	}
	return [...years.keys()].sort((a, b) => a - b).map((year) => ({ year, weeks: years.get(year)! }));
}

export type Metrics = {
	pub: PubInfo;
	/** Posts propios con fecha fiable. Es el número que se enseña. */
	totalPosts: number;
	/** Posts propios en total, incluida la importación. Para el pie. */
	totalOwnPosts: number;
	firstPostDate: string;
	lastPostDate: string;
	longestStreak: number;
	currentStreak: number;
	/** true cuando la racha viva ES el récord histórico. Se escribe sola. */
	streakIsRecord: boolean;
	years: YearCadence[];
	mostLiked: TopPost | null;
	mostCommented: TopPost | null;
	longestPost: TopPost | null;
	bestMonth: { month: string; posts: number } | null;
	words: TopWord[];
	headlines: HeadlineStats;
	day: TopDay | null;
	hour: TopHour | null;
	split: FreePaid | null;
	aggregates: Aggregates;
	heatmap: HeatmapRow[];
};

/**
 * El resumen completo. `null` cuando no hay archivo suficiente para una tarjeta.
 */
export function computeMetrics(
	posts: ArchivePost[],
	pub: PubInfo,
	now: Date
): Metrics | null {
	const dated = datedPosts(posts, pub.createdAt);
	if (dated.length < MIN_POSTS) return null;

	const months = new Map<string, number>();
	for (const p of dated) {
		const key = p.date.slice(0, 7);
		months.set(key, (months.get(key) ?? 0) + 1);
	}
	const best = [...months.entries()].sort((a, b) => b[1] - a[1])[0];
	const longest = longestStreak(dated);
	const current = currentStreak(dated, now);

	return {
		pub,
		totalPosts: dated.length,
		totalOwnPosts: ownPosts(posts).length,
		firstPostDate: dated[0].date,
		lastPostDate: dated[dated.length - 1].date,
		longestStreak: longest,
		currentStreak: current,
		streakIsRecord: current > 0 && current === longest,
		years: postsByYear(dated, now),
		mostLiked: topPost(posts, 'reactions', pub.createdAt),
		mostCommented: topPost(posts, 'comments', pub.createdAt),
		longestPost: topPost(posts, 'words', pub.createdAt),
		bestMonth: best ? { month: best[0], posts: best[1] } : null,
		words: topWords(dated),
		headlines: headlineStats(dated),
		day: topDay(dated),
		hour: topHour(dated),
		split: freePaid(dated),
		aggregates: aggregates(dated),
		heatmap: heatmapRows(dated)
	};
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `pnpm test`
Expected: PASS, todo. Si un número esperado no cuadra con el fixture, corrige el **test** contra el fixture: la fórmula está justificada arriba.

- [ ] **Step 5: Comprobar tipos**

Run: `pnpm check`
Expected: solo los 2 errores conocidos.

- [ ] **Step 6: Commit**

```bash
git add src/lib/authors/metrics.ts src/lib/authors/metrics.test.ts
git commit -m "feat(author): add headline, hour and aggregate metrics"
```

---

### Task 7: `lines.ts` — las frases y la regla que elige

**Files:**
- Create: `src/lib/authors/lines.ts`
- Test: `src/lib/authors/lines.test.ts`

El copy en español vive en un `.ts` y no en `author.md` **a propósito**, con el mismo precedente que `propuesta` en `src/lib/tools/newsletter/rules.ts` y que `src/lib/courses/*/course.ts`: es texto atado a una regla y a un número, y separarlo del umbral que lo dispara es cómo se acaba con una frase que ya no encaja con su condición.

**Interfaces:**
- Consumes: `Metrics` de `$lib/authors/metrics`
- Produces: `linesFor(m: Metrics): Lines`, tipo `Lines = { streak, words, likes, cadence, hour }` con `string | null` en cada clave

- [ ] **Step 1: Escribir el test que falla**

Crea `src/lib/authors/lines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { linesFor } from './lines';
import { computeMetrics } from './metrics';
import { deepFixture, DEEP_CREATED_AT } from './fixtures';

const PUB = {
	origin: 'https://x.substack.com',
	name: 'La publicación',
	authorName: 'Alguien',
	createdAt: DEEP_CREATED_AT,
	language: 'es',
	subscriberCount: null,
	subscriberCountLabel: '',
	logoUrl: null,
	paymentsEnabled: true
};

const metrics = computeMetrics(deepFixture(), PUB, new Date('2024-12-31T00:00:00.000Z'))!;

describe('linesFor', () => {
	it('no premia una racha corta: sin frase, solo el número', () => {
		const lines = linesFor({ ...metrics, longestStreak: 12 });
		// Un premio de consolación a quien lleva doce semanas suena a
		// condescendencia. El número se defiende solo.
		expect(lines.streak).toBe(null);
	});

	it('halaga una racha larga', () => {
		const lines = linesFor({ ...metrics, longestStreak: 276 });
		expect(lines.streak).toContain('276');
	});

	it('dice que la racha viva es el récord cuando lo es', () => {
		const lines = linesFor({ ...metrics, longestStreak: 276, currentStreak: 276, streakIsRecord: true });
		expect(lines.streak).toMatch(/ahora|hoy/i);
	});

	it('nombra la palabra que repite, escrita como la escribe él', () => {
		const lines = linesFor({ ...metrics, words: [{ word: 'jazz', posts: 32 }] });
		expect(lines.words).toContain('jazz');
		expect(lines.words).toContain('32');
	});

	it('no inventa frase de palabras si no hay ninguna repetida', () => {
		expect(linesFor({ ...metrics, words: [] }).words).toBe(null);
	});

	it('cuenta el techo de likes con su título', () => {
		const lines = linesFor(metrics);
		expect(lines.likes).toContain('8.854');
		expect(lines.likes).toContain('El techo de la casa');
	});

	it('no habla de likes cuando no hay techo', () => {
		expect(linesFor({ ...metrics, mostLiked: null }).likes).toBe(null);
	});

	it('la frase de la hora solo existe si la hora existe', () => {
		expect(linesFor({ ...metrics, hour: null }).hour).toBe(null);
		expect(linesFor({ ...metrics, hour: { hour: 5, share: 0.93 } }).hour).toContain('5');
	});
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/lib/authors/lines.test.ts`
Expected: FAIL — no existe `./lines`.

- [ ] **Step 3: Implementar**

Crea `src/lib/authors/lines.ts`:

```ts
import type { Metrics } from './metrics';

/**
 * Las frases de la tarjeta, elegidas por regla.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA REGLA QUE MANDA SOBRE LAS DEMÁS
 *
 * **Si el dato no da para halagar, no lleva frase.** Se devuelve `null` y el
 * número se queda solo.
 *
 * Un premio de consolación a quien lleva seis semanas es peor que el silencio y
 * es la forma más rápida de que un regalo suene a condescendencia. Y esta
 * tarjeta le llega a alguien que no la ha pedido.
 *
 * Aquí no hay modelo. Son plantillas: la misma URL da siempre la misma frase,
 * así que lo que Damian ve antes de mandar el enlace es exactamente lo que
 * verá quien lo abra.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Lines = {
	streak: string | null;
	words: string | null;
	likes: string | null;
	cadence: string | null;
	hour: string | null;
};

const es = (n: number) => n.toLocaleString('es-ES');

/** Umbrales de la frase de racha. Por debajo del menor, silencio. */
const STREAK_LONG = 200;
const STREAK_MID = 50;

const HOURS = [
	'medianoche', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho',
	'nueve', 'diez', 'once', 'doce', 'una', 'dos', 'tres', 'cuatro', 'cinco',
	'seis', 'siete', 'ocho', 'nueve', 'diez', 'once'
];

function streakLine(m: Metrics): string | null {
	const weeks = m.longestStreak;
	if (weeks < STREAK_MID) return null;

	const years = Math.floor(weeks / 52);
	if (m.streakIsRecord) {
		return `${es(weeks)} semanas seguidas publicando, y la racha sigue viva ahora mismo. Su mejor racha es la de hoy.`;
	}
	if (weeks >= STREAK_LONG) {
		return `${es(weeks)} semanas seguidas. ${years} años sin fallar una. Eso ya no es constancia, es oficio.`;
	}
	return `${es(weeks)} semanas seguidas apareciendo. Sin saltarse una.`;
}

function wordsLine(m: Metrics): string | null {
	const first = m.words[0];
	if (!first) return null;
	return `Escribe de ${first.word} y se le nota: ${es(first.posts)} titulares.`;
}

function likesLine(m: Metrics): string | null {
	const top = m.mostLiked;
	if (!top) return null;
	return `Su techo son ${es(top.post.reactions)} likes. Lo hizo con «${top.post.title}».`;
}

function cadenceLine(m: Metrics): string | null {
	// Solo cuando hay historia que situar: con un año no hay evolución.
	const closed = m.years.filter((y) => !y.inProgress);
	if (closed.length < 2) return null;
	const average = closed.reduce((sum, y) => sum + y.perMonth, 0) / closed.length;
	return `${average.toFixed(1)} posts al mes de media, ${closed.length} años seguidos.`;
}

function hourLine(m: Metrics): string | null {
	if (!m.hour) return null;
	const { hour, share } = m.hour;
	const percent = Math.round(share * 100);
	const when = hour < 6 ? 'de madrugada' : hour < 12 ? 'de la mañana' : hour < 20 ? 'de la tarde' : 'de la noche';
	return `Publica a las ${HOURS[hour]} ${when}: el ${percent}% de sus posts salen en esa franja.`;
}

export function linesFor(m: Metrics): Lines {
	return {
		streak: streakLine(m),
		words: wordsLine(m),
		likes: likesLine(m),
		cadence: cadenceLine(m),
		hour: hourLine(m)
	};
}
```

- [ ] **Step 4: Ejecutar los tests**

Run: `pnpm vitest run src/lib/authors/lines.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authors/lines.ts src/lib/authors/lines.test.ts
git commit -m "feat(author): pick flattering lines by rule, or stay silent"
```

---

### Task 8: copy, clases del tema y el límite de uso

**Files:**
- Create: `src/lib/content/author.md`
- Modify: `src/app.css` (dentro del `@layer components` existente)
- Modify: `src/lib/server/rate-limit.ts` (una entrada en `LIMITS`)

**Interfaces:**
- Consumes: `parseCopy` de `$lib/content`
- Produces: las claves de copy que consumen las Tasks 11-13; las clases `.figure`, `.figure-note`, `.heat`, `.heat-cell`, `.heat-on`; `LIMITS.authorCard`

- [ ] **Step 1: Escribir el copy**

Crea `src/lib/content/author.md`:

```markdown
---
# Textos de /author y /author/[author]. Edítalos aquí; no hay copy en los .svelte.
#
# ESTA TARJETA LLEGA A ALGUIEN QUE NO LA HA PEDIDO. Halaga o sitúa, nunca
# corrige. Si una línea suena a auditoría, está mal escrita: para auditar ya
# está /tool/newsletter.
#
# Por eso NO existe aquí ninguna clave sobre el hueco más largo sin publicar.
# Se descartó a propósito: es el único dato que se lee como reproche, y además
# el que las importaciones de archivo corrompen más (medido: 182 semanas de
# silencio falso en una publicación y 56 en otra, las dos inventadas por
# fechas importadas).

title: El Wrapped de tu Substack
description: Pega la dirección de un newsletter de Substack y sal con la tarjeta de su historia.
urlPlaceholder: tunewsletter.substack.com
urlButton: Ver la tarjeta
reading: Leyendo su archivo
readingCount: "{n} posts leídos"
download: Descargar la tarjeta

# --- Etiquetas de las cifras ---
labelPosts: posts publicados
labelStreak: semanas seguidas
labelStreakLive: semanas seguidas, y sigue
labelWords: palabras escritas
labelNovels: "≈ {n} novelas, a 80.000 palabras cada una"
labelLikes: likes en todo su archivo
labelConversation: comentarios y respuestas
labelMostLiked: Su post más gustado
labelMostCommented: El que más conversación levantó
labelLongest: El más largo que ha escrito
labelBestMonth: Su mes más prolífico
labelWordsTop: Las palabras de sus titulares
labelYears: Posts por año
labelHeatmap: Cada semana que ha publicado
labelDay: Su día
labelHour: Su hora
labelSplit: Gratis y de pago
labelSubscribers: suscriptores
labelHeadlineLength: "Sus titulares miden {n} caracteres de media."

# --- Avisos honestos ---
# Se enseñan cuando toca y no se esconden en un pie: son parte del dato.
noteUtc: Las horas y los días se calculan en UTC.
noteImported: Tiene {n} posts más de un archivo importado, con fechas que no se pueden usar para medir tiempo.
noteTruncated: Su archivo es más largo de lo que se ha podido leer de una vez. Esto sale de los primeros {n} posts.
noteFeed: Substack no ha dejado leer su archivo completo. Esto sale de sus últimos {n} posts, y por eso faltan los likes, los comentarios y el reparto entre gratis y pago.

# --- Firma ---
signature: Hecho por Damian Soto

# --- Errores ---
errorNotSubstack: Esto no parece un Substack. ¿Es la dirección correcta?
errorNotFound: No hay ninguna publicación en esa dirección.
errorBlocked: Substack no ha dejado leer esta publicación ahora mismo. Prueba en un rato.
errorRateLimit: Has mirado muchas por hoy. Vuelve mañana.
errorTooNew: Esta publicación acaba de empezar. Con {n} posts todavía no hay historia que contar.
---

Pega la dirección de un newsletter de Substack y sale la tarjeta de todo lo que
ha publicado: cuántas semanas seguidas lleva, cuántas palabras ha escrito y qué
post le funcionó mejor.

Solo lee lo que Substack ya enseña en público. No hace falta entrar en ninguna
cuenta.
```

- [ ] **Step 2: Añadir las clases al tema**

En `src/app.css`, **dentro** del bloque `@layer components` que ya existe, al final:

```css
	/*
	 * Los números grandes de las tarjetas de /author.
	 *
	 * El sitio tiene dos tamaños de letra y la jerarquía sale del color. Un
	 * Wrapped es la excepción: vive de que el número se vea antes que su
	 * etiqueta. Entra como clase y no como `text-6xl` suelto porque eso es lo
	 * que dice la regla: si hace falta otro tamaño, falta una clase aquí.
	 */
	.figure {
		@apply font-bold leading-none tracking-tight text-ink;
		font-size: 3.5rem;
	}
	@media (width >= 48rem) {
		.figure {
			font-size: 4.5rem;
		}
	}
	/* La etiqueta de un `.figure`. Es la nota del sitio, sin tamaño propio. */
	.figure-note {
		@apply text-muted;
		font-size: 0.875rem;
	}

	/*
	 * El mapa de calor de semanas: una fila por año, 53 casillas.
	 *
	 * La casilla no sabe qué mide, igual que `.meter`. El año se pinta fuera.
	 */
	.heat {
		@apply grid gap-[2px];
		grid-template-columns: repeat(53, minmax(0, 1fr));
	}
	.heat-cell {
		@apply rounded-[2px] bg-line;
		aspect-ratio: 1;
	}
	.heat-on {
		@apply bg-ink;
	}
```

- [ ] **Step 3: Añadir el límite**

En `src/lib/server/rate-limit.ts`, dentro de `LIMITS`, tras la entrada `subscribe`:

```ts
	/**
	 * La tarjeta de /author. No cuesta dinero —no hay modelo ni correo—, pero
	 * cada recorrido son hasta 50 peticiones al servidor de otra persona. El
	 * límite existe para proteger a Substack, no la factura. Por IP porque no
	 * hay correo que pedir: es la única herramienta sin puerta.
	 */
	authorCard: { max: 20, windowMs: HOUR_MS }
```

- [ ] **Step 4: Comprobar que el CSS compila y el tipo del límite existe**

Run: `pnpm check`
Expected: solo los 2 errores conocidos. Después `pnpm dev` y abre `/` — si Tailwind no compilara una clase nueva, la home saldría sin estilos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/author.md src/app.css src/lib/server/rate-limit.ts
git commit -m "feat(author): add copy, figure/heatmap classes and a rate limit"
```

---

### Task 9: el stream NDJSON con progreso y caché

**Files:**
- Create: `src/lib/server/author-cache.ts`
- Create: `src/routes/author/[author]/archive/+server.ts`

**Interfaces:**
- Consumes: `readPubInfo`, `walkArchive`, `readFeed`, `UnreadableError` de `$lib/server/substack-archive`; `computeMetrics` de `$lib/authors/metrics`; `linesFor` de `$lib/authors/lines`; `isValidSlug` de `$lib/authors/slug`; `overLimit` de `$lib/server/rate-limit`
- Produces:
  - `src/lib/server/author-cache.ts`: tipo `AuthorCard`, `readCard(slug): AuthorCard | null`, `writeCard(slug, card): void`. **La Task 12 importa las dos**: el módulo compartido es lo que evita que ver la tarjeta y descargar el PNG hagan dos recorridos.
  - `GET /author/<slug>/archive` que emite NDJSON. Una línea por mensaje:
  - `{"type":"progress","read":400}`
  - `{"type":"done","metrics":{...},"lines":{...},"source":"archive"|"feed","truncated":boolean,"importedCount":number}`
  - `{"type":"error","error":"not_substack"|"not_found"|"blocked"|"rate_limit"|"too_new","posts":number}`

- [ ] **Step 1: El módulo de caché, que comparten los dos endpoints**

Crea `src/lib/server/author-cache.ts`:

```ts
import type { Metrics } from '$lib/authors/metrics';
import type { Lines } from '$lib/authors/lines';

/**
 * La tarjeta ya calculada de un autor, en memoria.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO ES UN MÓDULO Y NO UN `Map` DENTRO DE UNA RUTA
 *
 * Lo usan DOS endpoints: el stream (`/author/<slug>/archive`) y la imagen
 * (`/author/<slug>/card.png`). Los dos corren en el mismo proceso, así que un
 * `Map` a nivel de módulo lo comparten.
 *
 * Con un `Map` dentro de cada ruta, ver una tarjeta y luego descargarla harían
 * **dos recorridos completos del archivo**: 58 peticiones al servidor de otra
 * persona en vez de 29, por una sola tarjeta. Eso es exactamente lo que no
 * queremos hacerle a nadie.
 *
 * Es memoria del proceso, así que es POR INSTANCIA y se pierde al desplegar,
 * igual que el contador de `rate-limit.ts`. Lo que sostiene el enlace
 * compartido es el `s-maxage` del CDN; esto solo evita el trabajo repetido
 * dentro de una instancia caliente.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type AuthorCard = {
	metrics: Metrics;
	lines: Lines;
	source: 'archive' | 'feed';
	truncated: boolean;
	/** Posts propios con fecha inservible. Se dice, no se esconde. */
	importedCount: number;
};

const CACHE_MS = 12 * 60 * 60 * 1000;
const cards = new Map<string, { at: number; card: AuthorCard }>();

export function readCard(slug: string): AuthorCard | null {
	const hit = cards.get(slug);
	if (!hit) return null;
	if (Date.now() - hit.at > CACHE_MS) {
		cards.delete(slug);
		return null;
	}
	return hit.card;
}

export function writeCard(slug: string, card: AuthorCard): void {
	// Poda perezosa: sin esto el Map crece mientras viva la instancia.
	if (cards.size > 500) {
		const now = Date.now();
		for (const [key, hit] of cards) {
			if (now - hit.at > CACHE_MS) cards.delete(key);
		}
	}
	cards.set(slug, { at: Date.now(), card });
}
```

- [ ] **Step 2: Implementar el endpoint**

Crea `src/routes/author/[author]/archive/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import {
	readPubInfo,
	walkArchive,
	readFeed,
	UnreadableError,
	type ArchivePost,
	type PubInfo
} from '$lib/server/substack-archive';
import { computeMetrics, ownPosts } from '$lib/authors/metrics';
import { linesFor } from '$lib/authors/lines';
import { isValidSlug } from '$lib/authors/slug';
import { overLimit } from '$lib/server/rate-limit';
import { readCard, writeCard, type AuthorCard } from '$lib/server/author-cache';

/**
 * El archivo de una publicación, en NDJSON y con progreso.
 *
 * POR QUÉ UN STREAM Y NO UN JSON DE UNA VEZ
 *
 * El archivo más profundo que se midió tarda 20,8 s (1330 posts, 29
 * peticiones). Veinte segundos de pestaña en blanco no se los come nadie, así
 * que el recorrido va informando de lo que lleva leído.
 *
 * EL PROGRESO NO LLEVA DENOMINADOR. La API no dice cuántos posts hay en total,
 * así que un "400 de ~1300" sería un número inventado. Dice "400 leídos".
 *
 * La caché la comparte con `/author/<slug>/card.png` a través de
 * `$lib/server/author-cache`. Ver el comentario de ese módulo: sin él, ver la
 * tarjeta y descargarla harían dos recorridos del archivo de la misma persona.
 */

/** Recorre el archivo y, si no se deja, cae al RSS. */
async function collect(
	pub: PubInfo,
	onProgress: (read: number) => void
): Promise<{ posts: ArchivePost[]; source: 'archive' | 'feed'; truncated: boolean }> {
	try {
		const { posts, truncated } = await walkArchive(pub.origin, onProgress);
		if (posts.length) return { posts, source: 'archive', truncated };
	} catch (cause) {
		console.error('[author] archive walk failed, falling back to RSS:', cause);
	}
	// El RSS trae 20 posts y ni likes ni comentarios ni audience. Es peor, pero
	// es mejor que fallar en seco.
	const posts = await readFeed(pub.origin);
	return { posts, source: 'feed', truncated: false };
}

export const GET: RequestHandler = async ({ params, getClientAddress }) => {
	const slug = params.author;
	if (!isValidSlug(slug)) error(400, 'Slug no válido');

	const encoder = new TextEncoder();
	const line = (value: unknown) => encoder.encode(JSON.stringify(value) + '\n');

	const stream = new ReadableStream({
		async start(controller) {
			const send = (value: unknown) => controller.enqueue(line(value));
			try {
				const hit = readCard(slug);
				if (hit) {
					send({ type: 'done', ...hit });
					return;
				}

				if (overLimit('authorCard', getClientAddress())) {
					send({ type: 'error', error: 'rate_limit' });
					return;
				}

				const pub = await readPubInfo(slug);
				const { posts, source, truncated } = await collect(pub, (read) =>
					send({ type: 'progress', read })
				);

				const metrics = computeMetrics(posts, pub, new Date());
				if (!metrics) {
					send({ type: 'error', error: 'too_new', posts: ownPosts(posts).length });
					return;
				}

				const card: AuthorCard = {
					metrics,
					lines: linesFor(metrics),
					source,
					truncated,
					importedCount: metrics.totalOwnPosts - metrics.totalPosts
				};
				writeCard(slug, card);
				send({ type: 'done', ...card });
			} catch (cause) {
				const reason = cause instanceof UnreadableError ? cause.reason : 'blocked';
				const map: Record<string, string> = {
					invalid_url: 'not_substack',
					empty: 'not_substack',
					not_found: 'not_found',
					timeout: 'blocked',
					blocked: 'blocked'
				};
				console.error('[author] collect failed:', cause);
				send({ type: 'error', error: map[reason] ?? 'blocked' });
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'application/x-ndjson; charset=utf-8',
			// Un stream no se cachea; lo que se cachea es la página que lo pide.
			'cache-control': 'no-store'
		}
	});
};
```

- [ ] **Step 3: Comprobar el tipo `reason` de `UnreadableError`**

Run: `grep -n "reason" src/lib/server/scrape.ts | head -5`
Expected: `UnreadableError` tiene una propiedad `reason`. Si se llamara de otra forma, ajusta el `catch`.

- [ ] **Step 4: Probar el stream contra las cuatro publicaciones de referencia**

Run: `pnpm dev`, y en otra terminal:

```bash
curl -N http://localhost:5173/author/kloshletter/archive
curl -N http://localhost:5173/author/honest-broker.com/archive
curl -N http://localhost:5173/author/platformer.news/archive
```

Expected:
- `kloshletter`: varias líneas `progress` y una `done` con `source":"archive"`.
- `honest-broker.com`: ~29 líneas de `progress`, y en `done` un `importedCount` alrededor de 447 (los 435 fechados en 2000 más los backdated).
- `platformer.news`: una sola línea `{"type":"error","error":"not_substack"}`.

- [ ] **Step 5: Comprobar tipos**

Run: `pnpm check`
Expected: solo los 2 errores conocidos.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/author-cache.ts src/routes/author/[author]/archive/+server.ts
git commit -m "feat(author): stream archive progress and metrics as NDJSON"
```

---

### Task 10: la carga de página barata y sus cabeceras

**Files:**
- Create: `src/routes/author/[author]/+page.server.ts`

**Interfaces:**
- Consumes: `readPubInfo`, `UnreadableError` de `$lib/server/substack-archive`; `isValidSlug` de `$lib/authors/slug`
- Produces: `data = { slug, pub: PubInfo | null, failure: 'not_substack'|'not_found'|'blocked'|null }`

- [ ] **Step 1: Implementar**

Crea `src/routes/author/[author]/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { readPubInfo, UnreadableError, type PubInfo } from '$lib/server/substack-archive';
import { isValidSlug } from '$lib/authors/slug';

/**
 * Solo la petición barata: la portada de la publicación.
 *
 * Aquí NO se recorre el archivo, y es a propósito. El recorrido tarda hasta
 * 20,8 s en el archivo más profundo que se midió, y un rastreador de redes que
 * viene a por las etiquetas `og:` no puede esperar eso. Con una sola petición
 * ya hay nombre, autor y suscriptores, que es todo lo que necesita la cabecera
 * y el `og:title`. El archivo lo pide el cliente al stream.
 */

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const slug = params.author;
	if (!isValidSlug(slug)) error(404, 'No hay ninguna publicación en esa dirección');

	let pub: PubInfo | null = null;
	let failure: 'not_substack' | 'not_found' | 'blocked' | null = null;
	try {
		pub = await readPubInfo(slug);
	} catch (cause) {
		const reason = cause instanceof UnreadableError ? cause.reason : 'blocked';
		failure = reason === 'not_found' ? 'not_found' : reason === 'blocked' || reason === 'timeout' ? 'blocked' : 'not_substack';
	}

	// La caché de verdad de este tool. El CDN sirve la página sin arrancar la
	// función, así que el enlace que Damian comparte abre al instante aunque la
	// instancia esté fría. Solo se cachea lo que salió bien.
	if (pub) {
		setHeaders({ 'cache-control': 'public, max-age=0, s-maxage=86400' });
	}

	return { slug, pub, failure };
};
```

- [ ] **Step 2: Comprobar tipos**

Run: `pnpm check`
Expected: solo los 2 errores conocidos.

- [ ] **Step 3: Commit**

```bash
git add src/routes/author/[author]/+page.server.ts
git commit -m "feat(author): load cheap publication metadata for the card page"
```

---

### Task 11: los gráficos y la página de la tarjeta

**Files:**
- Create: `src/lib/components/author/Heatmap.svelte`
- Create: `src/lib/components/author/Bars.svelte`
- Create: `src/routes/author/[author]/+page.svelte`

**Interfaces:**
- Consumes: `data` de la Task 10; el stream de la Task 9; copy de `author.md` vía `parseCopy`; `Metrics`, `Lines`
- Produces: la página. Ningún módulo depende de ella.

- [ ] **Step 1: El mapa de calor**

Crea `src/lib/components/author/Heatmap.svelte`:

```svelte
<script lang="ts">
	import type { HeatmapRow } from '$lib/authors/metrics';

	/**
	 * Una fila por año, una casilla por semana ISO.
	 *
	 * Es el visual del Wrapped: convierte una racha de 276 semanas en algo que
	 * se ve de un golpe, sin leer el número. Las clases están en `app.css`
	 * (`.heat`, `.heat-cell`, `.heat-on`).
	 */
	let { rows }: { rows: HeatmapRow[] } = $props();
</script>

<div class="flex flex-col gap-2">
	{#each rows as row (row.year)}
		<div class="flex items-center gap-3">
			<span class="figure-note w-10 shrink-0 tabular-nums">{row.year}</span>
			<div class="heat grow">
				{#each row.weeks as active, week (week)}
					<div class="heat-cell {active ? 'heat-on' : ''}"></div>
				{/each}
			</div>
		</div>
	{/each}
</div>
```

- [ ] **Step 2: Las barras**

Crea `src/lib/components/author/Bars.svelte`:

```svelte
<script lang="ts">
	/**
	 * Barras sobre `.meter`, que ya existe en `app.css` y no sabe qué mide: el
	 * relleno es un hijo con su ancho. Sirve igual para las palabras de los
	 * titulares y para los posts por año.
	 */
	let {
		items
	}: { items: { label: string; value: number; note?: string }[] } = $props();

	const max = $derived(Math.max(1, ...items.map((i) => i.value)));
</script>

<ul class="flex flex-col gap-3">
	{#each items as item (item.label)}
		<li class="flex items-center gap-3">
			<span class="body-text w-32 shrink-0 truncate">{item.label}</span>
			<span class="meter grow">
				<span style="width: {(item.value / max) * 100}%"></span>
			</span>
			<span class="figure-note w-24 shrink-0 text-right tabular-nums">
				{item.value.toLocaleString('es-ES')}{item.note ? ` ${item.note}` : ''}
			</span>
		</li>
	{/each}
</ul>
```

- [ ] **Step 3: Comprobar que `.meter` acepta un hijo con `width`**

Run: `grep -n -A 8 "\.meter" src/app.css`
Expected: `.meter` con un hijo (`> *` o similar) que toma su ancho. Si el relleno se pintara de otra forma, ajusta el markup de `Bars.svelte` a lo que diga `app.css`; no cambies `app.css`.

- [ ] **Step 4: La página**

Crea `src/routes/author/[author]/+page.svelte`:

```svelte
<script lang="ts">
	import PageMeta from '$lib/components/PageMeta.svelte';
	import Heatmap from '$lib/components/author/Heatmap.svelte';
	import Bars from '$lib/components/author/Bars.svelte';
	import { parseCopy } from '$lib/content';
	import raw from '$lib/content/author.md?raw';
	import type { Metrics } from '$lib/authors/metrics';
	import type { Lines } from '$lib/authors/lines';
	import type { PageData } from './$types';

	/**
	 * La tarjeta.
	 *
	 * El servidor solo trajo la portada de la publicación (barata), así que la
	 * cabecera y las `og:` se pintan ya. El archivo llega por el stream de
	 * `/author/<slug>/archive`, que va diciendo cuántos posts lleva leídos.
	 *
	 * Ninguna casilla se queda vacía: dos de las métricas son condicionales y
	 * simplemente no se pintan cuando no hay dato. Nunca un "N/A", nunca un
	 * cero, nunca una caja vacía.
	 */
	let { data }: { data: PageData } = $props();

	const { t } = parseCopy(raw);
	const es = (n: number) => n.toLocaleString('es-ES');
	const fill = (key: string, n: number | string) => (t[key] ?? '').replace('{n}', String(n));

	const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
	const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
	const monthName = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`;
	const dateName = (iso: string) => `${Number(iso.slice(8, 10))} de ${monthName(iso)}`;

	let read = $state(0);
	let metrics = $state<Metrics | null>(null);
	let lines = $state<Lines | null>(null);
	let source = $state<'archive' | 'feed'>('archive');
	let truncated = $state(false);
	let importedCount = $state(0);
	let failure = $state<string | null>(data.failure);
	let tooNewPosts = $state(0);
	let loading = $state(false);

	async function run() {
		if (!data.pub) return;
		loading = true;
		try {
			const response = await fetch(`/author/${data.slug}/archive`);
			const reader = response.body?.getReader();
			if (!reader) throw new Error('no stream');
			const decoder = new TextDecoder();
			let buffer = '';
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const parts = buffer.split('\n');
				buffer = parts.pop() ?? '';
				for (const part of parts) {
					if (!part.trim()) continue;
					const message = JSON.parse(part);
					if (message.type === 'progress') read = message.read;
					else if (message.type === 'done') {
						metrics = message.metrics;
						lines = message.lines;
						source = message.source;
						truncated = message.truncated;
						importedCount = message.importedCount;
					} else if (message.type === 'error') {
						failure = message.error;
						tooNewPosts = message.posts ?? 0;
					}
				}
			}
		} catch (error) {
			console.error('[author] stream failed:', error);
			failure = 'blocked';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (data.pub && !metrics && !failure && !loading) run();
	});

	const errorText = $derived(
		failure === 'not_found'
			? t.errorNotFound
			: failure === 'rate_limit'
				? t.errorRateLimit
				: failure === 'too_new'
					? fill('errorTooNew', tooNewPosts)
					: failure === 'blocked'
						? t.errorBlocked
						: failure
							? t.errorNotSubstack
							: ''
	);

	const pageTitle = $derived(data.pub ? `${data.pub.name} en números` : t.title);
</script>

<PageMeta
	title={pageTitle}
	description={data.pub ? `La historia pública de ${data.pub.name}, en una tarjeta.` : t.description}
	image={data.pub ? `/author/${data.slug}/card.png` : undefined}
/>

<section class="section">
	{#if errorText}
		<div class="screen-center">
			<p class="body-text">{errorText}</p>
			<a class="link-quiet" href="/author">Probar con otra</a>
		</div>
	{:else if data.pub}
		<header class="flex flex-col gap-2">
			<h1 class="box-title">{data.pub.name}</h1>
			<p class="muted">
				{data.pub.authorName}
				{#if data.pub.createdAt}· desde {monthName(data.pub.createdAt.slice(0, 10))}{/if}
				<!-- Solo sale si la publicación lo enseña en su portada. Si no, no se
				     dice nada: ni el número, ni una etiqueta vaga, ni un hueco. -->
				{#if data.pub.subscriberCount}
					· {es(data.pub.subscriberCount)} {t.labelSubscribers}
				{/if}
			</p>
		</header>

		{#if !metrics}
			<p class="muted mt-8">
				{t.reading}… {#if read}{fill('readingCount', es(read))}{/if}
			</p>
		{:else}
			{#if source === 'feed'}
				<p class="box-locked mt-6">{fill('noteFeed', es(metrics.totalPosts))}</p>
			{/if}
			{#if truncated}
				<p class="box-locked mt-6">{fill('noteTruncated', es(metrics.totalPosts))}</p>
			{/if}

			<!-- El espinazo: lo que siempre existe -->
			<div class="mt-10 grid gap-10 sm:grid-cols-2">
				<div>
					<p class="figure">{es(metrics.totalPosts)}</p>
					<p class="figure-note">{t.labelPosts}</p>
				</div>
				<div>
					<p class="figure">{es(metrics.longestStreak)}</p>
					<p class="figure-note">
						{metrics.streakIsRecord ? t.labelStreakLive : t.labelStreak}
					</p>
					{#if lines?.streak}<p class="body-text mt-2">{lines.streak}</p>{/if}
				</div>
				{#if metrics.aggregates.words > 0}
					<div>
						<p class="figure">{es(metrics.aggregates.words)}</p>
						<p class="figure-note">{t.labelWords}</p>
						{#if metrics.aggregates.novels}
							<p class="body-text mt-2">{fill('labelNovels', metrics.aggregates.novels)}</p>
						{/if}
					</div>
				{/if}
				{#if metrics.aggregates.reactions > 0}
					<div>
						<p class="figure">{es(metrics.aggregates.reactions)}</p>
						<p class="figure-note">{t.labelLikes}</p>
					</div>
				{/if}
				{#if metrics.aggregates.conversation > 0}
					<div>
						<p class="figure">{es(metrics.aggregates.conversation)}</p>
						<p class="figure-note">{t.labelConversation}</p>
					</div>
				{/if}
			</div>

			<!-- Los techos -->
			<div class="mt-12 flex flex-col gap-6">
				{#each [
					{ label: t.labelMostLiked, top: metrics.mostLiked, value: metrics.mostLiked?.post.reactions },
					{ label: t.labelMostCommented, top: metrics.mostCommented, value: metrics.mostCommented?.post.comments },
					{ label: t.labelLongest, top: metrics.longestPost, value: metrics.longestPost?.post.words }
				] as row (row.label)}
					{#if row.top}
						<div class="box">
							<p class="figure-note">{row.label}</p>
							<p class="body-text">«{row.top.post.title}»</p>
							<p class="muted">
								{es(row.value ?? 0)}{#if row.top.showDate} · {dateName(row.top.post.date.slice(0, 10))}{/if}
							</p>
						</div>
					{/if}
				{/each}
				{#if lines?.likes}<p class="body-text">{lines.likes}</p>{/if}
			</div>

			<!-- El mapa de calor -->
			{#if metrics.heatmap.length}
				<div class="mt-12">
					<p class="figure-note mb-3">{t.labelHeatmap}</p>
					<Heatmap rows={metrics.heatmap} />
				</div>
			{/if}

			<!-- Las palabras -->
			{#if metrics.words.length}
				<div class="mt-12">
					<p class="figure-note mb-3">{t.labelWordsTop}</p>
					<Bars items={metrics.words.map((w) => ({ label: w.word, value: w.posts }))} />
					{#if lines?.words}<p class="body-text mt-3">{lines.words}</p>{/if}
				</div>
			{/if}

			<!-- Posts por año -->
			{#if metrics.years.length > 1}
				<div class="mt-12">
					<p class="figure-note mb-3">{t.labelYears}</p>
					<Bars
						items={metrics.years.map((y) => ({
							label: String(y.year),
							value: y.posts,
							note: y.inProgress ? '· en curso' : ''
						}))}
					/>
					{#if lines?.cadence}<p class="body-text mt-3">{lines.cadence}</p>{/if}
				</div>
			{/if}

			<!-- Los condicionales: si no hay dato, no hay casilla -->
			<div class="mt-12 flex flex-col gap-6">
				{#if metrics.bestMonth}
					<p class="body-text">
						{t.labelBestMonth}: {monthName(metrics.bestMonth.month + '-01')},
						{es(metrics.bestMonth.posts)} posts.
					</p>
				{/if}
				{#if metrics.day}
					<p class="body-text">
						{t.labelDay}: {DAYS[metrics.day.weekday]}, {Math.round(metrics.day.share * 100)}% de sus posts.
					</p>
				{/if}
				{#if lines?.hour}<p class="body-text">{lines.hour}</p>{/if}
				{#if metrics.split}
					<p class="body-text">
						{t.labelSplit}: {es(metrics.split.free)} gratis y {es(metrics.split.paid)} de pago.
					</p>
				{/if}
				<p class="muted">{fill('labelHeadlineLength', metrics.headlines.averageLength)}</p>
			</div>

			<!-- Los avisos van con los datos, no escondidos en un pie -->
			<div class="mt-12 flex flex-col gap-2">
				{#if metrics.day || metrics.hour}<p class="muted">{t.noteUtc}</p>{/if}
				{#if importedCount > 0}
					<p class="muted">{fill('noteImported', es(importedCount))}</p>
				{/if}
			</div>

			<footer class="mt-12 flex flex-wrap items-center gap-6">
				<!-- En modo degradado no hay descarga: media tarjeta no se regala. -->
				{#if source === 'archive'}
					<a class="box-link" href="/author/{data.slug}/card.png" download="{data.slug}.png">
						{t.download}
					</a>
				{/if}
				<a class="link-quiet" href="/">{t.signature}</a>
			</footer>
		{/if}
	{/if}
</section>
```

- [ ] **Step 5: Comprobar las clases que se usan**

Run: `grep -n -E "\.(section|box|box-link|box-locked|box-title|box-text|body-text|muted|link-quiet|screen-center|meter)\b" src/app.css`
Expected: todas existen. Cualquiera que no exista, se sustituye por la que sí exista con ese papel; no se inventan clases nuevas fuera de las de la Task 8.

- [ ] **Step 6: Verificar en el navegador contra las cuatro publicaciones**

Run: `pnpm dev` y abre:
- `/author/kloshletter` — debe salir la hora (medido: 93% entre 05h y 06h) y **no** el reparto gratis/pago (todo gratis).
- `/author/honest-broker.com` — progreso subiendo durante ~20 s, mapa de calor con 6 filas, aviso de posts importados, reparto gratis/pago presente.
- `/author/liderar.substack.com` — **sin** día de la semana (medido: 18%, es ruido) y **sin** reparto (todo gratis).
- `/author/platformer.news` — el mensaje de "esto no parece un Substack".

- [ ] **Step 7: Comprobar tipos**

Run: `pnpm check`
Expected: solo los 2 errores conocidos.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/author src/routes/author/[author]/+page.svelte
git commit -m "feat(author): render the card with heatmap and bar charts"
```

---

### Task 12: el PNG

**Files:**
- Create: `src/lib/authors/card.ts`
- Create: `src/routes/author/[author]/card.png/+server.ts`

**Interfaces:**
- Consumes: `Metrics`, `Lines`; `readCard`/`writeCard` de `$lib/server/author-cache` (Task 9); el patrón de `src/routes/og/[slug].png/+server.ts`
- Produces: `cardTree(metrics: Metrics, lines: Lines, host: string): Record<string, unknown>`; `GET /author/<slug>/card.png`

- [ ] **Step 1: El árbol de la tarjeta**

Crea `src/lib/authors/card.ts`:

```ts
import type { Metrics } from './metrics';
import type { Lines } from './lines';

/**
 * El PNG de la tarjeta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LO QUE HAY QUE SABER ANTES DE TOCAR ESTO (está probado en /og)
 *
 *  - Es satori, no el navegador: acepta un SUBCONJUNTO de CSS y no lee
 *    `app.css`. Los colores van repetidos aquí como constantes; si cambia la
 *    paleta del tema, hay que cambiarlas también.
 *  - No hay JSX en SvelteKit, así que el árbol se escribe a mano como
 *    `{ type, props }`, igual que en `src/routes/og/[slug].png/+server.ts`.
 *  - Los `div` necesitan `display: flex` explícito casi siempre.
 *  - La fuente va como `.woff` (satori NO lee `.woff2`, que es lo que usa el
 *    sitio) y desde `$lib/server/fonts/`.
 *
 * La tarjeta NO lleva todos los datos de la página: 1200x630 no da, y una
 * imagen apretada no se lee en un móvil. Lleva el espinazo, el mapa de calor y
 * la firma. La página es la versión completa.
 * ─────────────────────────────────────────────────────────────────────────
 */

const INK = '#171717';
const SOFT = '#525252';
const MUTED = '#737373';
const LINE = '#e5e5e5';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const es = (n: number) => n.toLocaleString('es-ES');

type Node = Record<string, unknown>;

function div(style: Record<string, unknown>, children: unknown): Node {
	return { type: 'div', props: { style: { display: 'flex', ...style }, children } };
}

function stat(value: string, label: string): Node {
	return div({ flexDirection: 'column', gap: 6 }, [
		div({ fontSize: 64, fontWeight: 700, color: INK, lineHeight: 1 }, value),
		div({ fontSize: 22, color: MUTED }, label)
	]);
}

/** El mapa de calor, en casillas de 8px. Es el visual que se lee de un golpe. */
function heatmap(metrics: Metrics): Node {
	return div(
		{ flexDirection: 'column', gap: 4 },
		metrics.heatmap.slice(-6).map((row) =>
			div({ alignItems: 'center', gap: 8 }, [
				div({ fontSize: 16, color: MUTED, width: 44 }, String(row.year)),
				div(
					{ gap: 2 },
					row.weeks.map((active) =>
						div({ width: 8, height: 8, borderRadius: 2, backgroundColor: active ? INK : LINE }, [])
					)
				)
			])
		)
	);
}

export function cardTree(metrics: Metrics, lines: Lines, signature: string): Node {
	const stats: Node[] = [stat(es(metrics.totalPosts), 'posts'), stat(es(metrics.longestStreak), 'semanas seguidas')];
	if (metrics.aggregates.words > 0) stats.push(stat(es(metrics.aggregates.words), 'palabras'));
	if (metrics.aggregates.reactions > 0) stats.push(stat(es(metrics.aggregates.reactions), 'likes'));

	return div(
		{
			width: '100%',
			height: '100%',
			flexDirection: 'column',
			justifyContent: 'space-between',
			backgroundColor: '#ffffff',
			padding: '64px 72px',
			fontFamily: 'Inter'
		},
		[
			div({ flexDirection: 'column', gap: 10 }, [
				div({ fontSize: 52, fontWeight: 700, color: INK, lineHeight: 1.1 }, metrics.pub.name),
				div({ fontSize: 24, color: SOFT }, metrics.pub.authorName)
			]),
			div({ gap: 56 }, stats),
			heatmap(metrics),
			div({ alignItems: 'center', justifyContent: 'space-between' }, [
				div({ fontSize: 20, color: MUTED }, lines.streak ?? lines.words ?? ''),
				div({ fontSize: 20, color: MUTED }, signature)
			])
		]
	);
}
```

- [ ] **Step 2: El endpoint**

Crea `src/routes/author/[author]/card.png/+server.ts`:

```ts
import { ImageResponse } from '@vercel/og';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readPubInfo, walkArchive } from '$lib/server/substack-archive';
import { computeMetrics } from '$lib/authors/metrics';
import { linesFor } from '$lib/authors/lines';
import { isValidSlug } from '$lib/authors/slug';
import { readCard, writeCard } from '$lib/server/author-cache';
import { cardTree, CARD_WIDTH, CARD_HEIGHT } from '$lib/authors/card';
// Vite devuelve el fichero como data URI y de ahí se saca el búfer. Se importa
// así, y no leyendo del disco, para que el bundler lo empaquete con la función.
import inter400 from '$lib/server/fonts/inter-400.woff?inline';
import inter700 from '$lib/server/fonts/inter-700.woff?inline';

/**
 * La tarjeta en PNG: la descarga y el `og:image` de la página.
 *
 * Rasterizada a PNG y no servida como SVG a propósito: Facebook, X, LinkedIn y
 * WhatsApp ignoran los SVG en `og:image` y no enseñan nada. Mismo motivo y
 * mismo patrón que `src/routes/og/[slug].png/+server.ts`.
 *
 * **Lee la caché que comparte con el stream** (`$lib/server/author-cache`), y
 * solo recorre el archivo si no hay nada guardado. Sin eso, ver la tarjeta y
 * descargarla serían dos recorridos: 58 peticiones al servidor de otra persona
 * por una sola tarjeta. En la práctica el PNG casi siempre sale de la caché,
 * porque quien lo descarga acaba de ver la página.
 */

/** La fuente de serie de @vercel/og trae mal las métricas del espacio. */
function buffer(dataUri: string): ArrayBuffer {
	const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	return bytes.buffer;
}

const FONTS = [
	{ name: 'Inter', data: buffer(inter400), weight: 400 as const, style: 'normal' as const },
	{ name: 'Inter', data: buffer(inter700), weight: 700 as const, style: 'normal' as const }
];

export const GET: RequestHandler = async ({ params, url }) => {
	if (!isValidSlug(params.author)) error(404, 'No hay tarjeta para esa dirección');

	// Lo normal: quien descarga acaba de ver la página, así que ya está calculada.
	let card = readCard(params.author);
	if (!card) {
		const pub = await readPubInfo(params.author).catch(() => null);
		if (!pub) error(404, 'No hay tarjeta para esa dirección');

		const { posts, truncated } = await walkArchive(pub.origin);
		const metrics = computeMetrics(posts, pub, new Date());
		if (!metrics) error(404, 'Todavía no hay historia que contar');

		card = {
			metrics,
			lines: linesFor(metrics),
			source: 'archive' as const,
			truncated,
			importedCount: metrics.totalOwnPosts - metrics.totalPosts
		};
		writeCard(params.author, card);
	}

	return new ImageResponse(cardTree(card.metrics, card.lines, `hecho por ${url.host}`), {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		fonts: FONTS,
		headers: {
			// El archivo de alguien cambia como mucho a diario.
			'cache-control': 'public, max-age=3600, s-maxage=86400'
		}
	});
};
```

- [ ] **Step 3: Verificar el PNG de verdad, mirándolo**

Run: `pnpm dev` y abre `http://localhost:5173/author/kloshletter/card.png` en el navegador.
Expected: un PNG de 1200×630 con el nombre, cuatro cifras, el mapa de calor y la firma. Comprueba que **no hay texto cortado ni solapado**: satori no reajusta como el navegador. Repite con `/author/honest-broker.com/card.png`, que tiene el nombre más largo y seis filas de mapa.

- [ ] **Step 4: Comprobar el unfurl**

Run: en la página `/author/kloshletter`, ver el fuente y comprobar que `og:image` apunta a `/author/kloshletter/card.png` en absoluto.

```bash
curl -s http://localhost:5173/author/kloshletter | grep -o 'og:image[^>]*'
```

Expected: una URL absoluta acabada en `/author/kloshletter/card.png`.

- [ ] **Step 5: Comprobar tipos**

Run: `pnpm check`
Expected: solo los 2 errores conocidos.

- [ ] **Step 6: Commit**

```bash
git add src/lib/authors/card.ts src/routes/author/[author]/card.png/+server.ts
git commit -m "feat(author): render the shareable card as a PNG"
```

---

### Task 13: la landing con el formulario

**Files:**
- Create: `src/routes/author/+page.server.ts`
- Create: `src/routes/author/+page.svelte`

**Interfaces:**
- Consumes: `slugFromUrl` de `$lib/authors/slug`; copy de `author.md`
- Produces: `/author` y `/author?url=…` → `redirect(303, '/author/<slug>')`

- [ ] **Step 1: El redirect**

Crea `src/routes/author/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { slugFromUrl } from '$lib/authors/slug';

/**
 * El formulario manda aquí con `?url=`, y aquí se convierte en la URL canónica.
 *
 * Se hace en el servidor para que `/author/<slug>` sea la única dirección que
 * existe de una tarjeta: es la que se comparte y la que el CDN cachea. Sin
 * esto habría dos URLs para la misma tarjeta y solo una cachearía.
 */
export const load: PageServerLoad = async ({ url }) => {
	const raw = url.searchParams.get('url');
	if (!raw) return { invalid: false };

	const slug = slugFromUrl(raw);
	if (!slug) return { invalid: true };
	redirect(303, `/author/${slug}`);
};
```

- [ ] **Step 2: La página**

Crea `src/routes/author/+page.svelte`:

```svelte
<script lang="ts">
	import { marked } from 'marked';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { parseCopy } from '$lib/content';
	import raw from '$lib/content/author.md?raw';
	import type { PageData } from './$types';

	/**
	 * La entrada del tool.
	 *
	 * Es un `<form method="GET">` de toda la vida y no un `fetch`: así el
	 * servidor redirige a la URL canónica de la tarjeta y el visitante acaba en
	 * una dirección que puede compartir. Un `fetch` dejaría la tarjeta en
	 * `/author` sin URL propia.
	 */
	let { data }: { data: PageData } = $props();

	const { t, body } = parseCopy(raw);
	const intro = marked.parse(body) as string;
</script>

<PageMeta title={t.title} description={t.description} image="/og/author.png" />

<section class="section">
	<h1 class="box-title">{t.title}</h1>
	<div class="body-text">{@html intro}</div>

	<form method="GET" action="/author" class="mt-8 flex flex-wrap items-center gap-3">
		<input
			class="input grow"
			type="text"
			name="url"
			required
			placeholder={t.urlPlaceholder}
			aria-label={t.urlPlaceholder}
		/>
		<button class="btn btn-primary" type="submit">{t.urlButton}</button>
	</form>

	{#if data.invalid}
		<p class="muted mt-3">{t.errorNotSubstack}</p>
	{/if}
</section>
```

- [ ] **Step 3: Alinear el formulario con el que ya existe**

Run: `sed -n '1,60p' src/lib/components/InlineForm.svelte`
Expected: ver qué clases usa su `<input>` y su `<button>`. Copia **esas** clases en el formulario de arriba, para que este campo no se vea distinto del resto del sitio. Si `InlineForm` sirve tal cual con un `method="GET"`, úsalo en vez de escribir el markup a mano.

- [ ] **Step 4: Añadir la tarjeta OG de la landing**

En `src/lib/og-cards.ts`, comprueba cómo `cardFor` resuelve un slug. Como `/author` no está en `tools` hasta la Task 14, verifica que después de esa task `/og/author.png` devuelve una imagen:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/og/author.png
```

Expected: `200` una vez hecha la Task 14. Si diera 404, la entrada de `list.ts` no acaba en `/author`; corrige el `href`.

- [ ] **Step 5: Probar el formulario**

Run: `pnpm dev`, abre `/author`, escribe `kloshletter.substack.com` y envía.
Expected: la barra de direcciones acaba en `/author/kloshletter`. Prueba también `www.honest-broker.com` (→ `/author/honest-broker.com`) y `no es una url` (→ vuelve con el mensaje de error).

- [ ] **Step 6: Commit**

```bash
git add src/routes/author/+page.server.ts src/routes/author/+page.svelte
git commit -m "feat(author): add the landing form that redirects to the canonical card"
```

---

### Task 14: publicar en la home y verificación final

Esta es la task que **enciende** la herramienta. Hasta aquí todo era accesible por URL pero invisible, que es como funciona `list.ts`.

**Files:**
- Modify: `src/lib/tools/list.ts`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: la entrada en la home

- [ ] **Step 1: Añadir la entrada**

En `src/lib/tools/list.ts`, dentro del array `tools`, **la primera de la lista** (lo primero de la lista es lo primero que se ve):

```ts
	{
		name: 'El Wrapped de tu Substack',
		href: '/author',
		blurb: 'Pega la dirección de un newsletter. Sale la tarjeta de toda su historia.'
	},
```

Nota: **sin `capturesEmail`**. Es la primera de la lista que no pide correo, y es a propósito: la tarjeta es un regalo y un formulario de email delante la convertiría en captación.

- [ ] **Step 2: Comprobar que la home no asume que todas piden correo**

`capturesEmail` ya es opcional en el tipo `Tool`, así que no hay que tocar el tipo. Lo que hay que verificar es que la home lo lee condicionalmente, porque esta es la primera entrada que no lo trae:

```bash
grep -n "capturesEmail" src/routes/+page.svelte
```

Expected: se usa condicionalmente. Si pintara una etiqueta sin comprobar, añade la comprobación.

- [ ] **Step 3: Verificación final contra las cuatro publicaciones reales**

Run: `pnpm dev` y recorre esta lista, comprobando cada casilla:

| URL | Qué tiene que pasar |
|---|---|
| `/` | La entrada nueva aparece primera, sin marca de que pida email |
| `/author` | Formulario; `kloshletter.substack.com` lleva a `/author/kloshletter` |
| `/author/kloshletter` | Sale la hora (93% entre 05h y 06h). **No** sale gratis/pago. **No** sale día de la semana |
| `/author/honest-broker.com` | Progreso subiendo ~20 s; 6 filas de mapa; aviso de importados; gratis/pago presente; racha alrededor de 276 |
| `/author/liderar.substack.com` | **No** sale día (18% es ruido). **No** sale gratis/pago (todo gratis) |
| `/author/platformer.news` | "Esto no parece un Substack" |
| `/author/kloshletter/card.png` | PNG 1200×630, sin texto cortado |
| `/author/no-existe-jamas-12345` | Mensaje de error, no una pantalla en blanco |

- [ ] **Step 4: Comprobar tipos y tests**

Run: `pnpm check && pnpm test`
Expected: `check` con solo los 2 errores conocidos; `test` todo en verde.

- [ ] **Step 5: Comprobar que se construye**

Run: `pnpm build`
Expected: build correcto. Es lo que valida que `?inline` de las fuentes y `@vercel/og` se empaquetan bien en la función.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tools/list.ts
git commit -m "feat(author): list the Substack Wrapped on the home page"
```

---

## Lo que se descartó, y por qué

Que no vuelva por la puerta de atrás en una iteración futura:

- **El hueco más largo sin publicar.** Es el único dato que se lee como reproche, y la tarjeta le llega a alguien que no la ha pedido. Además es el que las importaciones corrompen más: la primera implementación dio **182 semanas de silencio en liderar** (2011→2015) y **56 en The Honest Broker**, las dos inventadas por fechas importadas. Ninguno de los dos autores se calló.
- **`restacks`.** El campo existe en la respuesta y llega **vacío en 868 de 868 posts** en las tres publicaciones. Medido.
- **`postTags`.** 17 posts de 128 en una publicación, cero en las otras dos.
- **La curva acumulada de palabras.** Se propuso y no se eligió. Si se retoma, es el gráfico más seguro de tono: solo puede subir.
- **La media de likes por año como gráfico.** Medido en The Honest Broker: 40 → 174 → 342 → **626** → 590 → 506. Sube y baja. Un gráfico así **corrige** a quien lleva dos años bajando, y esta tarjeta no corrige. Los agregados acumulados no tienen ese problema.
- **Una nota o puntuación sobre 100.** Es el error que ya se cometió en `/tool/newsletter`; el motivo largo está en `tally`, en `src/lib/tools/newsletter/rules.ts`.
- **Un cuadrado 1080×1080 para Substack Notes.** Quedaría mejor ahí, pero son dos árboles satori que mantener y el diseño ya se escribe dos veces. Añadido posterior si hace falta.
- **Llamar al modelo para escribir la frase.** La misma URL daría un texto distinto en cada recarga, así que lo que Damian ve antes de mandar el enlace no sería lo que ve quien lo abre.

## Riesgos conocidos

- **El día y la hora se calculan en UTC.** Un autor que publica a las 20:00 en Nueva York cae en el día siguiente en UTC. La página lo dice (`noteUtc`). Si `_preloads.pub` trajera una zona horaria, se podría corregir; no se ha buscado.
- **`freeSubscriberCount` puede estar oculto a propósito.** El comentario de `src/lib/server/newsletter.ts` avisa de que **que ese número se vea en la portada depende de un ajuste que no aparece como clave**. Damian decidió enseñar el número exacto con ese riesgo delante; el código cae a la etiqueta vaga si llega `null`, y a nada si tampoco hay etiqueta.
- **La caché en memoria es por instancia.** Lo que de verdad sostiene el enlace compartido es el `s-maxage` del CDN. Si esto creciera, el cambio sería un almacén compartido y solo cambiaría el interior del `Map`.
- **El endpoint del archivo no está documentado.** Puede cambiar sin avisar. Por eso existe el fallback a RSS y por eso la Task 4 incluye un paso que vuelve a medir `offset=0` contra la realidad.
