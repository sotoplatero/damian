#!/usr/bin/env node
/**
 * Baja el archivo público de una newsletter de Substack: el índice entero y los
 * cuerpos de los posts más recientes, en markdown.
 *
 * Portado de /tool/archive de damiansoto.me. En la web el trabajo lo reparte la
 * pestaña entre muchas peticiones al servidor, porque ninguna función sin estado
 * aguanta 1.333 descargas seguidas. Aquí no hace falta: esto corre en tu máquina
 * y puede estar el rato que haga falta.
 *
 *   node archivo.mjs <publicacion> [--out CARPETA] [--max N] [--todo]
 *
 * Sin dependencias. Node 18 o más nuevo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE ESTÁ MEDIDO Y NO SE TOCA A OJO
 *
 *  - `limit` de /api/v1/archive tope en 50. Con 100 contesta 400.
 *  - **`offset=0` devuelve como mucho 23 posts**, pida lo que pida `limit`. Con
 *    `offset=1` devuelve 50. Pasa igual en tres publicaciones distintas, así que
 *    es del sitio y no de una. Por eso el paseo avanza con `offset += recibidos`
 *    y NO con `offset += 50`: avanzar de 50 en 50 se salta 27 posts en la
 *    primera vuelta, sin error y sin nada que notar.
 *  - Un cuerpo no está en el archivo (`body_html` llega vacío) ni en
 *    /api/v1/posts/by-slug/ (redirige 302 a la página). Hay que bajar /p/{slug}
 *    y leer `_preloads.post`. Una petición por post: el coste es lineal.
 *  - Substack frena las páginas de post con 429 y se comporta como un cubo
 *    grande que se rellena rápido, NO como una cuota pequeña: 200 páginas
 *    seguidas sin un 429 desde un cubo descansado, y lo que sí lo saca se
 *    despeja en unos 31 s. La primera medición dijo que el muro estaba en 60-70
 *    porque se hizo después de 300 peticiones en veinte minutos: **un cubo
 *    vacío se parece exactamente a un cubo pequeño.**
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const PAGE_SIZE = 50;
const MAX_PAGES = 60;
/** Entre páginas del índice y entre cuerpos. Es el servidor de otro y no ha pedido nada de esto. */
const PAGE_SPACING_MS = 300;
const BODY_SPACING_MS = 100;
/** Lo que tarda en despejarse un 429, medido, con margen. */
const COOLDOWN_MS = 40_000;

/**
 * Cuántos cuerpos baja por defecto.
 *
 * ES UNA DECISIÓN DE PRODUCTO, NO UN TECHO TÉCNICO. Nada impide bajar 1.306:
 * medido, tarda unos dieciséis minutos. Ciento cincuenta es, MEDIDO contra
 * publicaciones reales, más o menos el último año —los 150 más nuevos de
 * honest-broker.com van de agosto de 2025 a agosto de 2026, y su último año son
 * 147— y su coste está acotado pase lo que pase con el ritmo de la publicación.
 * Un recuento le gana a una ventana de fechas también por otro lado: 447 posts
 * del Honest Broker dicen ser del año 2000. Con `--todo` no hay tope.
 */
const BODY_CAP = 150;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(message) {
	console.error(`\n${message}\n`);
	process.exit(1);
}

// ── Argumentos ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
	const args = { target: '', out: '', max: BODY_CAP };
	const rest = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--out') args.out = argv[++i] ?? '';
		else if (arg === '--max') args.max = Number(argv[++i]);
		else if (arg === '--todo' || arg === '--all') args.max = Infinity;
		else if (arg.startsWith('--')) fail(`No conozco la opción ${arg}.`);
		else rest.push(arg);
	}
	args.target = rest[0] ?? '';
	if (!args.target) {
		fail('Uso: node archivo.mjs <publicacion> [--out CARPETA] [--max N] [--todo]');
	}
	if (!Number.isFinite(args.max) && args.max !== Infinity) fail('--max necesita un número.');
	return args;
}

/** Lo que escriba la persona, convertido en el origen de la publicación. */
function toOrigin(raw) {
	const trimmed = String(raw).trim();
	let url;
	try {
		url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
	} catch {
		fail(`No entiendo «${raw}» como dirección.`);
	}
	// Da igual que peguen un post concreto: nos quedamos con el origen.
	const host = url.hostname.includes('.') ? url.host : `${url.host}.substack.com`;
	return `https://${host}`;
}

// ── Red ─────────────────────────────────────────────────────────────────────

async function get(url, accept) {
	return fetch(url, {
		signal: AbortSignal.timeout(20_000),
		headers: { 'user-agent': UA, accept, 'accept-language': 'es-ES,es;q=0.9,en;q=0.8' }
	});
}

/**
 * Saca el objeto de `window._preloads`. Substack lo mete como una cadena JSON
 * escapada dentro de `JSON.parse("...")`, así que hay dos rondas de parseo.
 */
function preloads(html) {
	const escaped = html.match(/window\._preloads\s*=\s*JSON\.parse\("((?:\\.|[^"\\])*)"\)/);
	if (escaped) {
		try {
			return JSON.parse(JSON.parse(`"${escaped[1]}"`));
		} catch {
			/* cae al siguiente intento */
		}
	}
	const plain = html.match(/window\._preloads\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
	if (plain) {
		try {
			return JSON.parse(plain[1]);
		} catch {
			/* nada */
		}
	}
	return {};
}

function decode(input) {
	return String(input)
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&');
}

const text = (value) => (typeof value === 'string' ? value : '');
const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

// ── La publicación ──────────────────────────────────────────────────────────

async function readPub(origin) {
	const response = await get(new URL(origin), 'text/html');
	if (response.status === 404) fail(`No existe ninguna publicación en ${origin}.`);
	if (!response.ok) fail(`${origin} contestó ${response.status}. Prueba dentro de un rato.`);
	const pub = preloads(await response.text()).pub ?? {};
	// Sin objeto `pub` no es un Substack. Medido: platformer.news contesta 200 y no lo trae.
	if (!pub.name) fail(`${origin} contesta, pero no parece una publicación de Substack.`);
	return {
		origin,
		name: decode(text(pub.name)).trim(),
		authorName: decode(text(pub.author_name)).trim(),
		createdAt: text(pub.created_at)
	};
}

function readPost(raw) {
	if (!raw || typeof raw !== 'object') return null;
	const title = text(raw.title);
	if (!title) return null;
	return {
		title: decode(title),
		subtitle: decode(text(raw.subtitle)),
		slug: text(raw.slug),
		date: text(raw.post_date),
		audience: text(raw.audience) || 'everyone',
		type: text(raw.type) || 'newsletter',
		words: num(raw.wordcount),
		reactions: num(raw.reaction_count),
		comments: num(raw.comment_count),
		restacks: num(raw.restacks)
	};
}

async function walkArchive(origin) {
	const posts = [];
	const seen = new Set();
	let offset = 0;

	for (let page = 0; page < MAX_PAGES; page++) {
		if (page > 0) await sleep(PAGE_SPACING_MS);

		const url = new URL('/api/v1/archive', origin);
		url.searchParams.set('sort', 'new');
		url.searchParams.set('limit', String(PAGE_SIZE));
		url.searchParams.set('offset', String(offset));

		const response = await get(url, 'application/json');
		if (!response.ok) fail(`El archivo contestó ${response.status}. Prueba dentro de un rato.`);

		let batch;
		try {
			batch = JSON.parse(await response.text());
		} catch {
			fail('El archivo contestó algo que no es JSON.');
		}
		// Con un `limit` inválido contesta un objeto con `errors`.
		if (!Array.isArray(batch)) fail('El archivo contestó una forma que no esperaba.');
		if (batch.length === 0) return { posts, truncated: false };

		for (const raw of batch) {
			const post = readPost(raw);
			// Un post sin slug no se puede enlazar y, peor, chocaría con cualquier
			// otro sin slug en `seen` y se perdería en silencio. Fuera del todo.
			if (!post || !post.slug || seen.has(post.slug)) continue;
			seen.add(post.slug);
			posts.push(post);
		}

		process.stdout.write(`\r  índice: ${posts.length} posts`);
		// Por lo recibido, no por PAGE_SIZE. Ver la cabecera.
		offset += batch.length;
	}

	return { posts, truncated: true };
}

// ── Los cuerpos ─────────────────────────────────────────────────────────────

/**
 * Un restack es el post de otra persona y un podcast es un reproductor: ninguno
 * de los dos tiene cuerpo que valga la pena bajar. En el índice siguen estando.
 */
const hasBody = (post) => post.type === 'newsletter';

async function readBodies(origin, slugs) {
	const bodies = new Map();
	let cooled = false;

	for (let i = 0; i < slugs.length; i++) {
		const slug = slugs[i];
		if (i > 0) await sleep(BODY_SPACING_MS);
		process.stdout.write(`\r  cuerpos: ${i + 1}/${slugs.length}`);

		let response;
		try {
			response = await get(new URL(`/p/${encodeURIComponent(slug)}`, origin), 'text/html');
		} catch {
			// Un post que no contesta se cae solo: sigue en el índice con sus
			// cifras, y la descarga no se viene abajo por uno.
			continue;
		}

		if (response.status === 429 || response.status === 403) {
			if (cooled) {
				process.stdout.write('\n');
				console.warn(`  Substack sigue frenando. Paro con ${bodies.size} cuerpos.`);
				return { bodies, stoppedBy: 'blocked' };
			}
			process.stdout.write('\n');
			console.warn(`  Substack ha contestado ${response.status}. Espero 40 s y sigo.`);
			await sleep(COOLDOWN_MS);
			cooled = true;
			i--; // este slug se reintenta
			continue;
		}

		if (!response.ok) continue;
		const post = preloads(await response.text()).post ?? {};
		const html = text(post.body_html);
		if (html) bodies.set(slug, html);
	}

	return { bodies, stoppedBy: 'complete' };
}

// ── HTML a markdown ─────────────────────────────────────────────────────────
//
// Esto es el producto: es lo que alguien abre dentro de seis meses, o le da a un
// modelo para aprender cómo escribe. Así que la estructura tiene que sobrevivir:
// títulos, citas, listas y sobre todo los enlaces, porque un post sin sus
// enlaces ha perdido parte de lo que decía.

/**
 * Contenedores cuyo subárbol entero es de Substack y no del autor: la caja de
 * suscripción, el botón de compartir, la encuesta, el panel de «esto es para
 * suscriptores de pago». Se busca en la etiqueta de apertura, que es donde los
 * widgets nuevos se identifican. **`pencraft` NO está aquí a propósito**: los
 * posts nuevos envuelven en esa clase los párrafos normales y vaciaría el cuerpo.
 */
const FURNITURE =
	/subscription-widget|subscribe-widget|button-wrapper|captioned-button|poll-embed|paywall|share-dialog|footer-buttons|digest-post-embed|SubscribeWidget|CommentInput/i;

/**
 * Quita esos contenedores andando por los `<div>` anidados, y no buscando el
 * primer `</div>`: los widgets son divs dentro de divs y el primer cierre nunca
 * es el que toca.
 */
function removeContainers(html, blacklist) {
	let out = '';
	let cursor = 0;

	while (cursor < html.length) {
		const open = html.indexOf('<div', cursor);
		if (open === -1) {
			out += html.slice(cursor);
			break;
		}
		const openEnd = html.indexOf('>', open);
		if (openEnd === -1) {
			out += html.slice(cursor);
			break;
		}
		if (!blacklist.test(html.slice(open, openEnd + 1))) {
			out += html.slice(cursor, openEnd + 1);
			cursor = openEnd + 1;
			continue;
		}

		out += html.slice(cursor, open);
		let depth = 1;
		let at = openEnd + 1;
		while (at < html.length && depth > 0) {
			const found = html.slice(at).search(/<\/?div\b/i);
			if (found === -1) return out;
			const tag = at + found;
			depth += html[tag + 1] === '/' ? -1 : 1;
			const tagEnd = html.indexOf('>', tag);
			if (tagEnd === -1) return out;
			at = tagEnd + 1;
		}
		cursor = at;
	}

	return out;
}

const strip = (html) => decode(html.replace(/<[^>]+>/g, ''));

function links(html) {
	return html.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, body) => {
		const label = strip(body).trim();
		if (!label) return '';
		// Un enlace cuyo texto ES su URL se lee mejor desnudo que como [url](url).
		return label === href ? href : `[${label}](${href})`;
	});
}

/**
 * Las listas, una lista entera cada vez. Punto por punto sería más simple y está
 * mal dos veces: los puntos de un `<ol>` solo los puede numerar algo que sepa a
 * qué lista pertenecen, y sustituidos de uno en uno acaban separados por una
 * línea en blanco cada uno.
 */
function renderList(_, tag, inner) {
	const ordered = tag.toLowerCase() === 'ol';
	const lines = [];
	let n = 0;

	for (const match of inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
		const item = strip(match[1])
			.replace(/[ \t]+/g, ' ')
			.replace(/\n{2,}/g, '\n')
			.trim();
		if (!item) continue;
		n += 1;
		const [head, ...rest] = item.split('\n');
		lines.push(`${ordered ? `${n}.` : '-'} ${head}`, ...rest.map((line) => `  ${line.trim()}`));
	}

	return lines.length ? `\n\n${lines.join('\n')}\n\n` : '\n\n';
}

function lists(html) {
	// Una lista sin ninguna lista dentro, que es lo que hace la pasada de dentro
	// afuera. Empezar por las de fuera con un `[\s\S]*?` normal cierra en el
	// `</ul>` INTERIOR, y entonces los puntos de la lista de fuera se funden en
	// uno: `a` y `b` salían como `ab`.
	const INNERMOST = /<(ul|ol)\b[^>]*>((?:(?!<\/?(?:ul|ol)\b)[\s\S])*?)<\/\1>/gi;
	let out = html;
	for (let pass = 0; pass < 5; pass++) {
		const before = out;
		out = out.replace(INNERMOST, renderList);
		if (out === before) break;
	}
	return out;
}

function blockquotes(html) {
	return html.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
		const quoted = strip(inner.replace(/<\/p>/gi, '\n'))
			.trim()
			.split('\n')
			.map((line) => `> ${line.trim()}`.trimEnd())
			.join('\n');
		return `\n\n${quoted}\n\n`;
	});
}

function htmlToMarkdown(html) {
	let out = removeContainers(html, FURNITURE);

	out = out
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<(script|style|svg|form)\b[\s\S]*?<\/\1>/gi, '');

	// Las imágenes antes que los enlaces: una imagen enlazada perdería su origen.
	out = out.replace(/<img\b[^>]*src=["']([^"']*)["'][^>]*>/gi, (_, src) => `\n\n![](${src})\n\n`);
	out = links(out);

	out = out
		.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, body) => `**${strip(body)}**`)
		.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, body) => `_${strip(body)}_`)
		.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => `\n\n\`\`\`\n${strip(code).trim()}\n\`\`\`\n\n`)
		.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => `\`${strip(code)}\``);

	out = blockquotes(out);
	out = lists(out);

	out = out
		.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, body) => {
			const heading = strip(body).trim();
			// Un título vacío es un div separador que dejó Substack, no una sección.
			return heading ? `\n\n${'#'.repeat(Number(level))} ${heading}\n\n` : '\n\n';
		})
		.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, item) => `\n- ${strip(item).trim()}\n`)
		.replace(/<hr\b[^>]*>/gi, '\n\n---\n\n')
		.replace(/<br\b[^>]*>/gi, '\n')
		.replace(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi, (_, body) => {
			const caption = strip(body).trim();
			return caption ? `\n\n_${caption}_\n\n` : '\n\n';
		})
		.replace(/<\/(p|div|figure|ul|ol|section|tr)>/gi, '\n\n');

	// Línea a línea, y no con un ` ?\n ?` global, porque esa regla se comía la
	// sangría de los puntos anidados: el único espacio inicial que significa algo.
	return strip(out)
		.replace(/\r/g, '')
		.split('\n')
		.map((line) => {
			const indent = /^ {2,}(?:-|\d+\.) /.test(line) ? (line.match(/^ +/)?.[0] ?? '') : '';
			return indent + line.trim().replace(/[ \t]+/g, ' ');
		})
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

// ── La salida ───────────────────────────────────────────────────────────────

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

function buildIndex(posts, origin) {
	const header = [
		'fecha', 'titulo', 'subtitulo', 'slug', 'acceso', 'tipo',
		'palabras', 'reacciones', 'comentarios', 'republicaciones', 'url'
	];
	const rows = posts.map((post) =>
		[
			post.date, post.title, post.subtitle, post.slug,
			post.audience === 'everyone' ? 'gratis' : 'pago',
			post.type, post.words, post.reactions, post.comments, post.restacks,
			`${origin}/p/${post.slug}`
		].map(csvCell).join(',')
	);
	return [header.join(','), ...rows].join('\n') + '\n';
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
	'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function monthsCovered(posts, slugs) {
	const set = new Set(slugs);
	const times = posts
		.filter((post) => set.has(post.slug))
		.map((post) => Date.parse(post.date))
		.filter(Number.isFinite);
	if (!times.length) return '';
	const from = new Date(Math.min(...times));
	const to = new Date(Math.max(...times));
	const say = (d) => `${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
	return say(from) === say(to) ? say(from) : `${say(from)} y ${say(to)}`;
}

function buildReadme(pub, posts, bodies, truncated, capped) {
	const written = posts.filter(hasBody).length;
	const free = posts.filter((p) => p.audience === 'everyone').length;
	// Los importados vienen fechados en 2000-01-01: una fecha así en el rango se
	// lee como un fallo. Medido en 435 de los 1.330 posts de un archivo real.
	const imported = posts.filter((p) => Date.parse(p.date) < Date.parse('2005-01-01')).length;
	const covered = monthsCovered(posts, [...bodies.keys()]);

	return `# ${pub.name}

Esto es el archivo público de **${pub.name}**${pub.authorName ? `, de ${pub.authorName}` : ''}.

**Lo que hay aquí lo escribió ${pub.authorName || 'su autor'} y es suyo.** Esta carpeta es una
copia para leer, buscar y estudiar. No es tuya para republicar.

Origen: ${pub.origin}
Bajado el ${new Date().toISOString().slice(0, 10)} con la herramienta de https://damiansoto.me/tool/archive

## Qué contiene

- \`indice.csv\` — **los ${posts.length} posts del archivo**, con su fecha, su acceso, sus
  palabras y sus cifras. El índice está completo.${truncated ? '\n  (Salvo que el archivo era más hondo que el tope de páginas: puede faltar algo antiguo.)' : ''}
- \`posts/\` — **${bodies.size} cuerpos en markdown**, los más recientes${covered ? `, de ${covered}` : ''}.

${
		written === posts.length
			? `Los ${posts.length} son envíos escritos.`
			: `De los ${posts.length} del índice, ${written} son envíos escritos; los otros ${posts.length - written} son podcasts o republicaciones de otras personas, que no tienen cuerpo que bajar.`
	} ${free} de ellos son gratuitos.${
		imported ? `\n\n${imported} posts vienen con fecha anterior a 2005: son de un archivo importado y esa fecha no es la real.` : ''
	}${
		capped
			? `\n\nLos cuerpos se pararon en ${bodies.size} porque ese era el tope. Para bajarlos todos, vuelve a lanzarlo con \`--todo\`.`
			: ''
	}

## Qué NO contiene

Los posts de pago llegan recortados o vacíos, porque esto lee lo mismo que un
visitante cualquiera. Salen en el índice marcados como \`pago\`.
`;
}

const pad = (n, width) => String(n).padStart(width, '0');

function fileNameFor(post, index, width) {
	const date = /^\d{4}-\d{2}-\d{2}/.test(post.date) ? post.date.slice(0, 10) : 'sin-fecha';
	const slug = post.slug.replace(/[^a-z0-9-]/gi, '-').slice(0, 60);
	return `${pad(index, width)}-${date}-${slug}.md`;
}

// ── Principal ───────────────────────────────────────────────────────────────

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const origin = toOrigin(args.target);

	console.log(`\nLeyendo ${origin}`);
	const pub = await readPub(origin);
	console.log(`  ${pub.name}${pub.authorName ? ` — ${pub.authorName}` : ''}`);

	const { posts, truncated } = await walkArchive(origin);
	process.stdout.write('\n');
	if (!posts.length) fail('El archivo no devolvió ni un post.');

	const candidates = posts.filter(hasBody).map((post) => post.slug);
	const capped = candidates.length > args.max;
	const wanted = capped ? candidates.slice(0, args.max) : candidates;
	if (capped) {
		console.log(
			`  ${candidates.length} envíos con cuerpo; bajo los ${wanted.length} más recientes. ` +
				`Con --todo los bajo todos.`
		);
	}

	const { bodies } = await readBodies(origin, wanted);
	process.stdout.write('\n');

	const dir = args.out || pub.origin.replace(/^https:\/\//, '').replace(/[^a-z0-9.-]/gi, '-');
	await mkdir(join(dir, 'posts'), { recursive: true });

	const byDate = posts.filter((post) => bodies.has(post.slug));
	const width = String(byDate.length).length;
	for (let i = 0; i < byDate.length; i++) {
		const post = byDate[i];
		const head = [
			`# ${post.title}`,
			post.subtitle ? `\n_${post.subtitle}_` : '',
			`\n${post.date.slice(0, 10)} · ${post.audience === 'everyone' ? 'gratis' : 'pago'} · ${origin}/p/${post.slug}`,
			'\n---\n'
		].join('\n');
		await writeFile(
			join(dir, 'posts', fileNameFor(post, i + 1, width)),
			`${head}\n${htmlToMarkdown(bodies.get(post.slug))}\n`,
			'utf8'
		);
	}

	await writeFile(join(dir, 'indice.csv'), buildIndex(posts, origin), 'utf8');
	await writeFile(join(dir, 'LEEME.md'), buildReadme(pub, posts, bodies, truncated, capped), 'utf8');

	console.log(`\nListo: ${dir}/`);
	console.log(`  indice.csv — ${posts.length} posts`);
	console.log(`  posts/ — ${bodies.size} cuerpos en markdown`);
	console.log(`  LEEME.md — qué hay y qué falta\n`);
}

main().catch((error) => fail(error?.message ? `Se ha roto: ${error.message}` : 'Se ha roto.'));
