import type { ArchivePost } from '$lib/server/substack-archive';
import type { ZipEntry } from './zip';

/**
 * The export, assembled: **ONE markdown file with the whole archive in it.**
 *
 * Everything here is pure — posts and bodies in, the zip's entries out — so it
 * can be tested without the network, which is where every interesting decision
 * about this tool lives. The network half is `+server.ts`; it does the walking
 * and hands the result to `buildExport`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ONE FILE, AND WHY IT USED TO BE MANY
 *
 * It was a `LEEME.md`, an `indice.csv` and a folder of one markdown file per post.
 * Damian collapsed it on 14 August 2026: what people do with this is hand it to a
 * model, and a folder of 150 files is something you have to reassemble first. So
 * the index is a list at the top and the posts follow it, newest first, separated
 * by rules.
 *
 * What that costs, so nobody re-discovers it as a bug: the CSV is gone, and with
 * it opening the figures in Excel. What it must not cost is the honesty — the
 * counts, what is missing and whose writing this is were sections of the README and
 * are now the head of the file. A copy of somebody's archive that doesn't say whose
 * it is, or claims to be complete when it isn't, is the one thing this file has
 * always been written against.
 *
 * The zip stays for one reason: the email carries it as an attachment, Vercel cuts
 * a request body at 4.5 MB, and markdown deflates to about a quarter.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THE EXPORT PROMISES, AND WHAT IT CAN'T
 *
 * The INDEX is complete: every post the archive returns, with its figures. That
 * is cheap — one request per fifty posts.
 *
 * The BODIES take one request each — `body_html` arrives empty from the archive,
 * and `/api/v1/posts/by-slug/` 302s to the page (measured, see `newsletter.ts`) —
 * so a 1333-post archive is 1333 requests. **They have no cap.** The browser asks
 * for one batch per request and keeps asking until the archive runs out, so what
 * bounds the file is how long the tab stays open: the visitor's call, not a number
 * decided in here.
 *
 * **The head says the real number, not the intended one.** A file that claims to be
 * someone's whole archive and quietly isn't is worse than one that says "these 43 of
 * their 340 posts" — the second is usable, the first gets trusted and then found
 * out.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * How many bodies the download goes for before it stops and asks.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS NUMBER IS A PRODUCT DECISION, NOT A TECHNICAL CEILING, AND IT MATTERS
 * THAT THE TWO AREN'T CONFUSED AGAIN.
 *
 * Two earlier caps (150, then 50) were read off a Substack that the previous
 * measurement had just hammered: **a drained bucket looks exactly like a small
 * bucket**. From a rested one, 200 unique post pages in a row draw no 429 at all,
 * and what it does draw clears in about half a minute (see `readPostBodies`).
 * Nothing technical stops this tool from reading 1306 posts — measured, it does,
 * in about sixteen minutes with the tab open.
 *
 * A hundred and fifty is where the download pauses and asks whether to go on,
 * because MEASURED against real publications, 150 posts is about the last year:
 *
 *   - honest-broker.com: 150 newest = Aug 2025 → Aug 2026. Its last year = **147**.
 *   - kloshletter (almost daily): 150 = Dec 2025 → Jul 2026, of 167 in total.
 *   - a ten-post publication: all ten, either way.
 *
 * So a count and a date window come to the same thing here, and the count is the
 * better rule twice over: its cost is bounded (150 requests, ~1.5 min, whatever
 * the publication's rhythm), and it cannot be fooled by imported dates — 447 of
 * The Honest Broker's posts claim the year 2000. What the date rule was really
 * after is INFORMATION, and that is given instead: the README and the page both
 * say which months the bodies cover.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const BODY_CAP = 150;

export type ExportPub = {
	name: string;
	authorName: string;
	/** The origin that answered, without a trailing slash. */
	origin: string;
	/** Substack's `created_at`. Used to spot imported dates, not printed. */
	createdAt: string;
};

export type ExportInput = {
	pub: ExportPub;
	/**
	 * The publication's slug, which names the file. Passed in rather than read off
	 * `pub.origin` so the zip and the markdown inside it carry the same name even
	 * for a publication on its own domain.
	 */
	slug: string;
	/** Newest first, as the walk returns them. */
	posts: ArchivePost[];
	/** slug → body already converted to markdown. Missing slugs are index-only. */
	bodies: Map<string, string>;
	/** The walk hit its page cap: there are older posts that aren't here. */
	truncated: boolean;
	/** The archive refused and this came from `/feed`: 20 posts, no figures. */
	fromFeed: boolean;
	/**
	 * Why the bodies stopped: it read the whole archive, it reached `BODY_CAP` and
	 * was told that was enough, or somebody pressed stop. Three different sentences
	 * in the README, because "there are fewer than the index" needs a reason to be
	 * worth reading.
	 */
	bodiesStoppedBy: 'complete' | 'cap' | 'stopped';
	/**
	 * This site's origin, for the one link the README carries back here.
	 *
	 * Passed in rather than read from `PUBLIC_SITE_URL`, for the same reason
	 * `sendCervantesEmail` takes it from the request: that variable is not set in
	 * the local `.env`, and a link with no host in front of it is worse than no
	 * link. No trailing slash.
	 */
	siteOrigin: string;
	generatedAt: Date;
};

export type Summary = {
	total: number;
	free: number;
	paid: number;
	/** Podcasts and restacks: counted apart, they aren't written issues. */
	other: number;
	/** ISO dates of the oldest and newest post, imported dates excluded. */
	from: string;
	to: string;
	/**
	 * Posts dated before the publication existed. An imported archive stamps
	 * them `2000-01-01` — measured on 435 of The Honest Broker's 1330 posts — and
	 * a date range built over those reads as a bug.
	 */
	importedDates: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function summarize(posts: ArchivePost[], createdAt: string): Summary {
	const floor = Date.parse(createdAt);
	const dated = posts
		.map((post) => ({ post, at: Date.parse(post.date) }))
		.filter((entry) => Number.isFinite(entry.at));
	// A day of slack: a post published the same day the publication was created
	// can carry an earlier timestamp than the pub row itself.
	const trustworthy = Number.isFinite(floor)
		? dated.filter((entry) => entry.at >= floor - DAY_MS)
		: dated;
	const range = trustworthy.length ? trustworthy : dated;
	const times = range.map((entry) => entry.at);

	return {
		total: posts.length,
		free: posts.filter((post) => post.audience === 'everyone').length,
		paid: posts.filter((post) => post.audience !== 'everyone').length,
		other: posts.filter((post) => post.type !== 'newsletter').length,
		from: times.length ? new Date(Math.min(...times)).toISOString() : '',
		to: times.length ? new Date(Math.max(...times)).toISOString() : '',
		importedDates: dated.length - trustworthy.length
	};
}

/**
 * Which posts are worth a request for their body, newest first. All of them, in
 * the order the walk returned — the browser works down this list and stops when it
 * runs out or when somebody says enough.
 */
export function bodyCandidates(posts: ArchivePost[]): ArchivePost[] {
	// A restack is somebody else's post. A podcast episode's body is a player and a
	// two-line description. Neither belongs in an archive of what this author wrote.
	return posts.filter((post) => post.type === 'newsletter' && post.slug);
}

/** `2026-08-12`, or an empty string when the date is unusable. */
function isoDay(date: string): string {
	const at = Date.parse(date);
	return Number.isFinite(at) ? new Date(at).toISOString().slice(0, 10) : '';
}

/** A slug turned into something every filesystem accepts. */
function safeName(slug: string): string {
	return (
		slug
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80) || 'post'
	);
}

function postUrl(origin: string, slug: string): string {
	return `${origin}/p/${slug}`;
}

/** `gratis` / `pago`, never `everyone` / `only_paid`. */
function audienceLabel(post: ArchivePost): string {
	return post.audience === 'everyone' ? 'gratis' : 'pago';
}

/**
 * What Substack calls an entry that isn't an issue, said in Spanish where there is
 * a word for it and left alone where there isn't. `type` is a free string from
 * their API, so an unknown value prints as it came rather than as a guess.
 */
const TYPE_LABEL: Record<string, string> = {
	podcast: 'podcast',
	thread: 'hilo',
	video: 'vídeo'
};

/**
 * The figures of a post, and only the ones it has.
 *
 * A zero is dropped rather than printed: from the RSS fallback every figure is
 * zero because the feed doesn't carry them, and «0 likes · 0 comentarios» on 20
 * posts reads as a publication nobody reads instead of as a missing source.
 */
function figures(post: ArchivePost): string[] {
	const parts: string[] = [];
	if (post.words) parts.push(`${post.words} palabras`);
	if (post.reactions) parts.push(`${post.reactions} likes`);
	if (post.comments) parts.push(`${post.comments} comentarios`);
	if (post.restacks) parts.push(`${post.restacks} restacks`);
	return parts;
}

/** Link text can't carry brackets: they end the link early. */
function linkText(title: string): string {
	return title.replace(/[[\]]/g, '\\$&');
}

/**
 * The index: every entry the archive returned, one line each, newest first.
 *
 * It says which lines have their post below and which don't, because that is the
 * question the index answers that the body list can't — a restack, a podcast or
 * anything past where the download stopped is here with its date and its link and
 * nothing else.
 */
export function buildIndexSection(input: ExportInput): string {
	const lines = ['## Índice', ''];

	for (const post of input.posts) {
		const day = isoDay(post.date);
		const title = post.slug
			? `[${linkText(post.title)}](${postUrl(input.pub.origin, post.slug)})`
			: linkText(post.title);
		const parts = [audienceLabel(post), ...figures(post)];
		if (post.type !== 'newsletter') parts.push(TYPE_LABEL[post.type] ?? post.type);
		if (!input.bodies.has(post.slug)) parts.push('solo en el índice');
		lines.push(`- ${day ? `**${day}** · ` : ''}${title} · ${parts.join(' · ')}`);
	}

	return `${lines.join('\n')}\n`;
}

/**
 * A body's own headings, pushed down under the post's `##`.
 *
 * In one file this matters: `html.ts` keeps whatever levels Substack's editor gave
 * a post, `#` included, so a body would otherwise outrank the title of the document
 * it is inside.
 *
 * **It skips fenced code, which is why this is a loop and not a `replace`.**
 * `html.ts` turns `<pre>` into a ``` block, and a shell comment or a CSS id inside
 * one starts with `#` without being a heading.
 */
export function demoteHeadings(markdown: string, by: number): string {
	let fenced = false;

	return markdown
		.split('\n')
		.map((line) => {
			if (/^\s*```/.test(line)) {
				fenced = !fenced;
				return line;
			}
			if (fenced) return line;
			const match = line.match(/^(#{1,6})\s/);
			if (!match) return line;
			return '#'.repeat(Math.min(match[1].length + by, 6)) + line.slice(match[1].length);
		})
		.join('\n');
}

/**
 * One post, as a section of the whole. Opens with a rule, because that is what
 * separates two posts in a file that has no folders left.
 */
export function buildPostSection(post: ArchivePost, markdown: string, origin: string): string {
	const meta = [longDate(post.date), audienceLabel(post), ...figures(post)].filter(Boolean);
	if (post.sectionName) meta.push(post.sectionName);
	if (post.slug) meta.push(`[en Substack](${postUrl(origin, post.slug)})`);

	const lines = ['---', '', `## ${post.title}`, ''];
	if (post.subtitle) lines.push(`_${post.subtitle}_`, '');
	lines.push(meta.join(' · '), '');
	if (post.audience !== 'everyone') {
		lines.push(
			'> Post de pago. De aquí solo se puede leer lo que se ve sin estar suscrito, así que este cuerpo puede estar cortado.',
			''
		);
	}
	lines.push(demoteHeadings(markdown, 2));

	return `${lines.join('\n').trimEnd()}\n`;
}

function spanishDate(date: Date): string {
	return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** A post's date as `10 de agosto de 2026`, or nothing when it is unusable. */
function longDate(iso: string): string {
	const at = Date.parse(iso);
	return Number.isFinite(at) ? spanishDate(new Date(at)) : '';
}

function monthYear(iso: string): string {
	if (!iso) return '';
	return new Date(iso).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

/**
 * The months the bodies actually cover, «de agosto de 2025 a agosto de 2026».
 *
 * This is the information a date-window rule would have given, handed over
 * without adopting its problems: a count of posts can't be fooled by the 447
 * entries The Honest Broker dates in the year 2000, and it costs the same every
 * time. The reader's question is "how far back does this go?", and it deserves an
 * answer whichever way the file was built.
 */
export function monthsCovered(posts: ArchivePost[], bodies: Map<string, string>): string {
	const times = posts
		.filter((post) => bodies.has(post.slug))
		.map((post) => Date.parse(post.date))
		.filter((at) => Number.isFinite(at));
	if (!times.length) return '';
	const from = monthYear(new Date(Math.min(...times)).toISOString());
	const to = monthYear(new Date(Math.max(...times)).toISOString());
	return from === to ? `de ${from}` : `de ${from} a ${to}`;
}

const bodyRange = (input: ExportInput) => monthsCovered(input.posts, input.bodies);

/**
 * Rough minutes for N bodies, so a sentence can help somebody decide whether to
 * carry on. From the measurements: 2.9 pages a second, plus a 40-second pause
 * every hundred or so when Substack asks for one. Exported because the page has to
 * quote the same figure the README does.
 */
export function minutesFor(count: number): number {
	return Math.max(1, Math.round((count / 2.9 + Math.floor(count / 100) * 40) / 60));
}

/**
 * The same figure as a phrase that reads like Spanish. «unos 1 min» is what you
 * get from interpolating a number into a template, and it is what shipped for one
 * measurement before somebody read it.
 */
export function minutesPhrase(count: number): string {
	const minutes = minutesFor(count);
	return minutes === 1 ? 'un minuto' : `unos ${minutes} minutos`;
}

/**
 * The head of the file: what it is, whose it is, and what is missing from it.
 *
 * This is what is left of the README, and it is deliberately short — three lines and
 * a list that only appears when something really is missing. What was cut was the
 * inventory («qué hay aquí dentro»), which described a folder that no longer exists,
 * and the tally, which the index below now says line by line.
 */
export function buildHead(input: ExportInput, summary: Summary): string {
	const { pub, bodies } = input;
	const lines: string[] = [];

	lines.push(`# El archivo de ${pub.name}`);
	lines.push('');
	lines.push(
		`Todo lo que ${pub.name} ha publicado en abierto, sacado de ${pub.origin} el ${spanishDate(
			input.generatedAt
		)}. **${summary.total} ${summary.total === 1 ? 'entrada' : 'entradas'}** en el índice y **${
			bodies.size
		} ${bodies.size === 1 ? 'post entero' : 'posts enteros'}** debajo, del más reciente hacia atrás.`
	);
	lines.push('');
	// Not a footnote: the usual reader of this file is holding somebody else's
	// archive, which is what the tool is for.
	lines.push(
		`Lo escribió ${
			pub.authorName || pub.name
		} y sigue siendo suyo. Esto es una copia de lo que ya está publicado en abierto, para leerlo, buscarlo y guardarlo. No lo publiques como si fuera tuyo.`
	);
	lines.push('');

	// The honest half. Every one of these is a way the file is less than its
	// title promises, and each says why, because "incomplete for a reason" is
	// usable and "incomplete" is not.
	const caveats: string[] = [];
	if (input.fromFeed) {
		caveats.push(
			'El archivo completo no contestó, así que esto sale del feed RSS: **solo los 20 posts más recientes**, y sin likes, comentarios ni palabras (el feed no los da; van a cero, no están estimados). Vuelve a intentarlo en un rato para llevarte el archivo entero.'
		);
	}
	if (input.truncated) {
		caveats.push(
			'El archivo es tan largo que la lectura tocó su tope de páginas: **hay posts más antiguos que no están en el índice**.'
		);
	}
	const asked = bodyCandidates(input.posts).length;
	if (input.bodiesStoppedBy === 'cap') {
		caveats.push(
			`Los cuerpos son los **${bodies.size} más recientes**${
				bodyRange(input) ? ` (${bodyRange(input)})` : ''
			}, de los ${asked} que tiene esta publicación. No es un límite técnico: se puede bajar el archivo entero, y son ${minutesPhrase(asked - bodies.size)} más de pestaña abierta. Ciento cincuenta viene a ser el último año en una publicación que escribe cada semana. El índice sí lleva todas las entradas.`
		);
	}
	if (input.bodiesStoppedBy === 'stopped') {
		caveats.push(
			`La descarga se paró antes de acabar: hay **${bodies.size}** cuerpos de los ${asked} que tiene esta publicación${
				bodyRange(input) ? ` (${bodyRange(input)})` : ''
			}. El índice sí está completo. Cada cuerpo es una petición aparte a Substack, así que un archivo largo tarda: si quieres el resto, vuelve a pedirlo y deja la pestaña abierta hasta el final.`
		);
	}
	if (summary.paid) {
		caveats.push(
			'De los posts de pago solo se puede leer lo que Substack muestra sin suscripción, así que esos cuerpos pueden estar cortados. Cada uno lo dice encima del suyo.'
		);
	}
	if (summary.importedDates) {
		caveats.push(
			`**${summary.importedDates}** entradas llevan una fecha anterior a la propia publicación. Pasa cuando el archivo se importó de otro sitio: Substack les pone una fecha de relleno. Están en el índice con la fecha que da Substack, sin tocar.`
		);
	}
	if (caveats.length) {
		lines.push('## Lo que falta, y por qué');
		lines.push('');
		for (const caveat of caveats) lines.push(`- ${caveat}`);
	}

	// Trimmed at the end because `buildArchive` puts the blank line between parts.
	return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * The whole archive as one document: head, index, and every body it has, newest
 * first. The last line is the only mention of this site, and it is the reason the
 * tool travels — somebody who is handed one of these can go and make their own.
 */
export function buildArchive(input: ExportInput, summary: Summary): string {
	const parts = [buildHead(input, summary), buildIndexSection(input)];

	for (const post of input.posts) {
		const markdown = input.bodies.get(post.slug);
		if (!markdown) continue;
		parts.push(buildPostSection(post, markdown, input.pub.origin));
	}

	parts.push(
		`---\n\nHecho con [el archivo de una newsletter](${input.siteOrigin}/tool/archive), una herramienta de Objeto Brillante.\n`
	);

	return parts.join('\n');
}

export function exportFileName(slug: string, at: Date): string {
	return `archivo-${safeName(slug)}-${at.toISOString().slice(0, 10)}.zip`;
}

/** The one file inside, named after the zip around it. */
export function archiveFileName(slug: string, at: Date): string {
	return `archivo-${safeName(slug)}-${at.toISOString().slice(0, 10)}.md`;
}

/**
 * Ceiling on the characters of body text the zip carries.
 *
 * Nothing else here has a natural bound: the post count isn't capped any more and
 * a single post can be any length — `readBody` alone lets 3 MB of HTML through per
 * request. This is what keeps one absurd publication from asking a browser tab to
 * hold hundreds of megabytes of strings while it zips them.
 *
 * Twelve million characters is far past any real archive — 1333 posts of 1200 words
 * is about 10 M — so it is a backstop and not a routine trim. It drops the OLDEST
 * bodies, because the newest are the ones somebody came for.
 */
const MAX_BODY_CHARS = 12_000_000;

/**
 * The bodies that fit in the budget, newest first. The count the head prints comes
 * from this, so what it says is what the file has.
 */
function withinBudget(posts: ArchivePost[], bodies: Map<string, string>): Map<string, string> {
	const kept = new Map<string, string>();
	let total = 0;
	for (const post of posts) {
		const markdown = bodies.get(post.slug);
		if (markdown === undefined) continue;
		if (total + markdown.length > MAX_BODY_CHARS) break;
		total += markdown.length;
		kept.set(post.slug, markdown);
	}
	return kept;
}

export function buildExport(raw: ExportInput): { entries: ZipEntry[]; summary: Summary } {
	const input: ExportInput = { ...raw, bodies: withinBudget(raw.posts, raw.bodies) };
	const summary = summarize(input.posts, input.pub.createdAt);
	const entries: ZipEntry[] = [
		{
			name: archiveFileName(input.slug, input.generatedAt),
			content: buildArchive(input, summary)
		}
	];

	return { entries, summary };
}
