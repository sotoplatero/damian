import raw from '$lib/content/course.md?raw';

/**
 * The UI strings of /course/[slug], read once from `content/course.md`.
 *
 * WHY THIS FILE EXISTS. The page and `report.ts` both used to do the same two
 * lines — import the markdown raw, then `parseCopy(raw)` — and `parseCopy` lived
 * in `src/lib/content.ts`, which was **deleted** in `ca1321b` when the markdown
 * copy system came out. The course landed afterwards (`99c9f01`) still importing
 * it, so `pnpm build` failed outright: `$lib/content` now resolves to the
 * `content/` DIRECTORY, and reading a directory is an `EISDIR`. Type-checking
 * only called it a missing module; the build is what refused.
 *
 * So the parser lives here, scoped to courses, and is NOT a revival of the
 * site-wide markdown copy system — that one is gone on purpose and page copy
 * belongs where it is used. This one file earns its keep: `course.md` is read by
 * the screen AND by the emailed report, and its own header comment promises they
 * cannot call the same thing by two different names. Parsing it once, here, is
 * what actually delivers that; two parses in two files was the shape that lets a
 * key drift.
 */

export type Copy = {
	/** The frontmatter strings. */
	t: Record<string, string>;
	/** The body, as unprocessed markdown. */
	body: string;
};

export function parseCopy(source: string): Copy {
	let body = source;
	const t: Record<string, string> = {};

	const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (frontmatter) {
		body = source.slice(frontmatter[0].length);
		for (const line of frontmatter[1].split('\n')) {
			const trimmed = line.trim();
			// Lines starting with # are comments and never ship: that is where the
			// notes to Damian live inside the copy file itself.
			if (!trimmed || trimmed.startsWith('#')) continue;
			const separator = trimmed.indexOf(':');
			if (separator === -1) continue;
			t[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
		}
	}

	return { t, body };
}

/** The strings themselves. Import these, not the parser. */
export const { t } = parseCopy(raw);
