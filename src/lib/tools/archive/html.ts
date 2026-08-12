import { decode } from '$lib/server/substack';

/**
 * Substack's `body_html` turned into readable markdown.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY NOT `toPlainText`, WHICH ALREADY EXISTS
 *
 * `newsletter.ts` flattens a body to plain text because it only wants to COUNT
 * things in it: links out, whether there's a CTA, how it closes. Nobody reads
 * that output.
 *
 * This one is the product. It is what somebody opens six months from now, or
 * hands to a model to learn how they write, so the structure has to survive:
 * headings, quotes, lists, and above all the links — a post stripped of its
 * links has lost part of what it said.
 *
 * WHAT GETS THROWN AWAY, ON PURPOSE
 *
 * Substack injects its own furniture into the body: the subscribe box, the
 * share button, the poll, the "this post is for paid subscribers" panel. None of
 * it is the author's writing and all of it repeats in every single post, so it
 * is removed by container before anything else is converted. `removeContainers`
 * walks nested `<div>`s rather than regex-matching a closing tag, because the
 * widgets are divs inside divs and the first `</div>` is never the right one.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Containers whose whole subtree is Substack's, not the author's.
 *
 * Matched against the opening tag, so it catches both `class="..."` and
 * `data-component-name="..."`, which is how the newer widgets identify
 * themselves. Deliberately NOT in here: `pencraft`, the class newer posts wrap
 * ordinary paragraphs in — blacklisting it empties the body.
 */
const FURNITURE =
	/subscription-widget|subscribe-widget|button-wrapper|captioned-button|poll-embed|paywall|share-dialog|footer-buttons|digest-post-embed|SubscribeWidget|CommentInput/i;

function removeContainers(html: string, blacklist: RegExp): string {
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

		// Keep what came before it and then skip to its matching close.
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

/** `<a href="x">y</a>` → `[y](x)`. Text first: it may itself carry tags. */
function links(html: string): string {
	return html.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
		const label = strip(text).trim();
		if (!label) return '';
		// A link whose text IS its URL reads better bare than as [url](url).
		return label === href ? href : `[${label}](${href})`;
	});
}

/** Tags gone, entities decoded. The last step for anything inline. */
function strip(html: string): string {
	return decode(html.replace(/<[^>]+>/g, ''));
}

/**
 * Lists, one whole list at a time.
 *
 * Item by item would be simpler and it is wrong twice: an `<ol>`'s items can only
 * be numbered by something that knows which list they belong to, and items
 * replaced one at a time end up separated by a blank line each, because the
 * paragraph collapse at the end can't tell an item break from a paragraph break.
 * A list has to come out tight or it reads as a pile of one-line paragraphs.
 *
 * A nested list flattens into the outer one: the non-greedy match closes on the
 * inner `</ul>`, so the items all survive and only their indentation is lost.
 */
function renderList(_: string, tag: string, inner: string): string {
	const ordered = tag.toLowerCase() === 'ol';
	const lines: string[] = [];
	let n = 0;

	for (const match of inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
		const item = strip(match[1])
			.replace(/[ \t]+/g, ' ')
			.replace(/\n{2,}/g, '\n')
			.trim();
		if (!item) continue;
		n += 1;
		// An item can already carry the lines of a list nested inside it, turned
		// into markdown by an earlier pass. Those keep their own line, indented
		// under this one, instead of being flattened into its text.
		const [head, ...rest] = item.split('\n');
		lines.push(`${ordered ? `${n}.` : '-'} ${head}`, ...rest.map((line) => `  ${line.trim()}`));
	}

	return lines.length ? `\n\n${lines.join('\n')}\n\n` : '\n\n';
}

function lists(html: string): string {
	/**
	 * A list with no list inside it, which is what makes the pass innermost-first.
	 * Matching outer lists first with a plain non-greedy `[\s\S]*?` closes on the
	 * INNER `</ul>`, and then the outer items get merged into one — `a` and `b`
	 * came out as `ab`. Items are the thing that must never be lost.
	 */
	const INNERMOST = /<(ul|ol)\b[^>]*>((?:(?!<\/?(?:ul|ol)\b)[\s\S])*?)<\/\1>/gi;
	let out = html;
	// One pass per level of nesting. Five is far past anything anybody writes,
	// and the loop stops as soon as a pass changes nothing.
	for (let pass = 0; pass < 5; pass++) {
		const before = out;
		out = out.replace(INNERMOST, renderList);
		if (out === before) break;
	}
	return out;
}

function blockquotes(html: string): string {
	return html.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner: string) => {
		const text = strip(inner.replace(/<\/p>/gi, '\n')).trim();
		const quoted = text
			.split('\n')
			.map((line) => `> ${line.trim()}`.trimEnd())
			.join('\n');
		return `\n\n${quoted}\n\n`;
	});
}

export function htmlToMarkdown(html: string): string {
	let out = removeContainers(html, FURNITURE);

	out = out
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<(script|style|svg|form)\b[\s\S]*?<\/\1>/gi, '');

	// Images before links: a linked image would otherwise lose its source.
	out = out.replace(/<img\b[^>]*src=["']([^"']*)["'][^>]*>/gi, (_, src) => `\n\n![](${src})\n\n`);
	out = links(out);

	out = out
		.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text) => `**${strip(text)}**`)
		.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text) => `_${strip(text)}_`)
		.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => `\n\n\`\`\`\n${strip(code).trim()}\n\`\`\`\n\n`)
		.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => `\`${strip(code)}\``);

	out = blockquotes(out);
	out = lists(out);

	out = out
		.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, text: string) => {
			const heading = strip(text).trim();
			// An empty heading is a spacer div Substack left behind, not a section.
			return heading ? `\n\n${'#'.repeat(Number(level))} ${heading}\n\n` : '\n\n';
		})
		.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, item: string) => `\n- ${strip(item).trim()}\n`)
		.replace(/<hr\b[^>]*>/gi, '\n\n---\n\n')
		.replace(/<br\b[^>]*>/gi, '\n')
		.replace(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi, (_, text: string) => {
			const caption = strip(text).trim();
			return caption ? `\n\n_${caption}_\n\n` : '\n\n';
		})
		.replace(/<\/(p|div|figure|ul|ol|section|tr)>/gi, '\n\n');

	// Line by line, and not with a global ` ?\n ?` collapse, because that rule ate
	// the indentation of nested list items — the only leading whitespace in here
	// that means something. Anything else at the start of a line is whitespace
	// from the source html and still goes.
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
