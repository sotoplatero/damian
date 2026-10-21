import type { ArchivePost } from '$lib/server/substack-archive';

/**
 * What worked for a publication, read off its index alone.
 *
 * The archive tool used to hand over raw material and nothing else: a zip of
 * somebody's posts and no opinion about them. This is the opinion, and it costs
 * nothing — the index already carries likes, comments and restacks for every
 * post, so no extra request goes to Substack and no model is involved.
 *
 * THE RANKING IS AGAINST EACH POST'S OWN NEIGHBOURS, NOT AGAINST THE ARCHIVE.
 * A raw "most liked" list is a list of the newest posts of the biggest year: a
 * post from three years ago was written for a fraction of today's audience, and
 * whatever the author published last week has the whole list behind it. What a
 * reader studying someone else's newsletter wants is the post that beat ITS OWN
 * moment, so each post is measured against the median of the posts around it in
 * time (`lift`). That also makes a small newsletter and a huge one comparable:
 * ×3 means the same thing at 20 likes and at 2,000.
 *
 * Every part is conditional and vanishes rather than showing noise — the same
 * rule the old postcard metrics followed. The whole analysis is `null` when the
 * index carries no figures (the RSS fallback zeroes them) or too few posts.
 */

/** Fewer eligible posts than this and a neighbourhood median means nothing. */
export const MIN_POSTS = 12;
/** Posts on each side of a post that form its baseline. */
export const WINDOW = 8;
/**
 * A post this recent is still collecting likes, so comparing it with posts that
 * have finished would always sink it. A week is when most of a post's
 * engagement has already arrived.
 */
export const SETTLE_DAYS = 7;
/** Below this, "above normal" is a coin flip, not a standout. */
export const MIN_LIFT = 2;
/**
 * And it has to beat its baseline by this many interactions, not only in
 * proportion. MEASURED on kloshletter, a daily digest whose posts sit around 5:
 * with a ratio alone (×1.5, 10 interactions minimum) it listed ten "standouts" at
 * 10–14 interactions — noise presented as a finding. Requiring the margin turns
 * that into the honest answer, "nothing stands out", while The Honest Broker's
 * real hits (×6 to ×22, hundreds to thousands above baseline) are untouched.
 */
export const MIN_EXCESS = 10;
export const MAX_STANDOUTS = 10;
/** A section needs this many posts before its median is worth printing. */
export const SECTION_MIN_POSTS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export type Standout = {
	post: ArchivePost;
	interactions: number;
	/** Interactions over the median of its neighbours. */
	lift: number;
};

export type SectionStat = { name: string; posts: number; medianInteractions: number };

export type Analysis = {
	/** Best lift first. Empty when nothing stood out: that is an answer too. */
	standouts: Standout[];
	/** How many posts the ranking looked at, said next to it. */
	ranked: number;
	/** Posts a month over the last year (or the publication's life, if shorter). */
	perMonth: number | null;
	medianWords: number | null;
	/** Only when the author really uses sections: two or more with enough posts. */
	sections: SectionStat[];
};

/**
 * What a reader did with a post. `childComments` is left out on purpose: it
 * counts replies inside threads, the author's own answers included, so a post
 * where the author chatted back looks twice as discussed.
 */
export function interactions(post: ArchivePost): number {
	return post.reactions + post.comments + post.restacks;
}

export function median(values: number[]): number {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The author's own written posts, with a date that can be trusted, oldest first.
 * Restacks are other people's posts and a podcast is a different medium; an
 * imported post's date is filler (`2000-01-01` on 435 of The Honest Broker's
 * 1330), and a neighbourhood built on filler dates is a random sample.
 */
function ownDated(posts: ArchivePost[], createdAt: string): { post: ArchivePost; at: number }[] {
	const floor = Date.parse(createdAt);
	return posts
		.filter((post) => post.type === 'newsletter')
		.map((post) => ({ post, at: Date.parse(post.date) }))
		.filter(({ at }) => Number.isFinite(at) && (!Number.isFinite(floor) || at >= floor - DAY_MS))
		.sort((a, b) => a.at - b.at);
}

export function standouts(posts: ArchivePost[], createdAt: string, now: Date): {
	standouts: Standout[];
	ranked: number;
} {
	// Free posts only: a paid post can only be liked by paying readers, so next to
	// free neighbours it always looks like a flop.
	const eligible = ownDated(posts, createdAt).filter(
		({ post, at }) => post.audience === 'everyone' && now.getTime() - at >= SETTLE_DAYS * DAY_MS
	);
	if (eligible.length < MIN_POSTS) return { standouts: [], ranked: eligible.length };

	const counts = eligible.map(({ post }) => interactions(post));
	const found: Standout[] = [];
	for (let i = 0; i < eligible.length; i++) {
		const around = [
			...counts.slice(Math.max(0, i - WINDOW), i),
			...counts.slice(i + 1, i + 1 + WINDOW)
		];
		const baseline = median(around);
		const count = counts[i];
		if (count - baseline < MIN_EXCESS) continue;
		// A zero baseline would make any count infinitely above normal; one is the
		// smallest audience a post can have had.
		const lift = count / Math.max(baseline, 1);
		if (lift >= MIN_LIFT) found.push({ post: eligible[i].post, interactions: count, lift });
	}

	found.sort((a, b) => b.lift - a.lift || b.interactions - a.interactions);
	return { standouts: found.slice(0, MAX_STANDOUTS), ranked: eligible.length };
}

/**
 * Posts a month, counted over the last twelve months — or over the publication's
 * whole life when it is younger than that, so a three-month-old newsletter isn't
 * reported at a quarter of its real pace.
 */
export function perMonth(posts: ArchivePost[], createdAt: string, now: Date): number | null {
	const dated = ownDated(posts, createdAt);
	if (!dated.length) return null;
	const yearAgo = now.getTime() - 365 * DAY_MS;
	const recent = dated.filter(({ at }) => at >= yearAgo);
	if (!recent.length) return null;
	const since = Math.max(yearAgo, dated[0].at);
	const months = Math.max(1, (now.getTime() - since) / (30.44 * DAY_MS));
	return recent.length / months;
}

export function sectionStats(posts: ArchivePost[]): SectionStat[] {
	const groups = new Map<string, number[]>();
	for (const post of posts) {
		if (post.type !== 'newsletter' || !post.sectionName) continue;
		const list = groups.get(post.sectionName) ?? [];
		list.push(interactions(post));
		groups.set(post.sectionName, list);
	}
	const stats = [...groups]
		.filter(([, counts]) => counts.length >= SECTION_MIN_POSTS)
		.map(([name, counts]) => ({
			name,
			posts: counts.length,
			medianInteractions: median(counts)
		}))
		.sort((a, b) => b.medianInteractions - a.medianInteractions);
	return stats.length >= 2 ? stats : [];
}

export function analyze(
	posts: ArchivePost[],
	createdAt: string,
	now: Date,
	fromFeed = false
): Analysis | null {
	// The feed carries no likes, comments or restacks: everything would rank at
	// zero, and an analysis of zeros is a made-up one.
	if (fromFeed) return null;
	const own = ownDated(posts, createdAt);
	if (own.length < MIN_POSTS) return null;
	if (!own.some(({ post }) => interactions(post) > 0)) return null;

	const words = own.map(({ post }) => post.words).filter((count) => count > 0);
	return {
		...standouts(posts, createdAt, now),
		perMonth: perMonth(posts, createdAt, now),
		medianWords: words.length ? Math.round(median(words)) : null,
		sections: sectionStats(posts)
	};
}

/**
 * The words, read by both the page and the markdown file so the two can't drift.
 * The method line is not optional decoration: a ranking whose rule isn't stated
 * is an opinion dressed as a number.
 */
export const ANALYSIS_COPY = {
	title: 'Lo que mejor le funcionó',
	method:
		'Cada post comparado con los que publicó alrededor, no con todo el archivo: un post de hace tres años se escribió para mucha menos gente. Cuentan likes, comentarios y restacks. Los de pago y los de la última semana se quedan fuera. He mirado {ranked} posts.',
	none: 'Ningún post se despega de los que tiene alrededor: esta publicación rinde parecido de un envío a otro.',
	standout: '{interactions} interacciones, {lift} sobre lo normal en su momento',
	cadence: 'Publica {cadence}.',
	words: 'Sus posts tienen unas {words} palabras (la mediana).',
	sectionsTitle: 'Por secciones',
	section: '{name}: {posts} posts, mediana de {median} interacciones'
};

export function fillCopy(template: string, values: Record<string, string | number>): string {
	return Object.entries(values).reduce(
		(text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
		template
	);
}

const number = (n: number) => Math.round(n).toLocaleString('es-ES');

/** The figures under a standout's title, as one line. */
export function standoutLine(standout: Standout): string {
	return fillCopy(ANALYSIS_COPY.standout, {
		interactions: number(standout.interactions),
		lift: formatLift(standout.lift)
	});
}

/** The pace and length lines, only the ones there is data for. */
export function habitLines(analysis: Analysis): string[] {
	const lines: string[] = [];
	if (analysis.perMonth !== null)
		lines.push(fillCopy(ANALYSIS_COPY.cadence, { cadence: cadencePhrase(analysis.perMonth) }));
	if (analysis.medianWords !== null)
		lines.push(fillCopy(ANALYSIS_COPY.words, { words: number(analysis.medianWords) }));
	return lines;
}

export function sectionLine(section: SectionStat): string {
	return fillCopy(ANALYSIS_COPY.section, {
		name: section.name,
		posts: section.posts,
		median: number(section.medianInteractions)
	});
}

/** `×3,1`, Spanish decimal comma, one decimal. */
export function formatLift(lift: number): string {
	return `×${lift.toFixed(1).replace('.', ',')}`;
}

/** «unos 4 al mes», «unos 2,5 al mes», «uno al mes o menos». */
export function cadencePhrase(perMonth: number): string {
	if (perMonth < 1.25) return 'uno al mes o menos';
	const rounded = perMonth < 3 ? Math.round(perMonth * 2) / 2 : Math.round(perMonth);
	return `unos ${String(rounded).replace('.', ',')} al mes`;
}
