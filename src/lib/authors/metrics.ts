import type { ArchivePost, PubInfo } from '$lib/server/substack-archive';

/**
 * From posts to metrics. Pure functions: nothing here asks the network.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THERE ARE THREE SETS AND NOT ONE FILTER
 *
 * A single filter breaks in both directions, and both were measured:
 *
 *   - Unfiltered, The Honest Broker's streak starts in the year 2000, because
 *     **435 of its 1330 posts are dated `2000-01-01`**: an imported archive of
 *     book reviews. Gaps of silence appear that never happened.
 *   - Filtering everything by `created_at` throws away those 435 REAL posts,
 *     which have real likes and real comments.
 *
 * So:
 *   `ownPosts`   — everything that isn't someone else's post. For the rankings.
 *   `datedPosts` — those, plus a date after `created_at`. For anything with a
 *                  shape in time: streaks, cadence, weekday, hour.
 *
 * The floor is `created_at` and NEVER `first_post_date`, which lies: measured
 * `2000-01-01` on The Honest Broker and `2011-06-28` on liderar.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Below this there is no card: one full of ones is not a gift. */
export const MIN_POSTS = 5;
/**
 * How much the top weekday must weigh to be a fact rather than noise.
 *
 * Measured: The Honest Broker's top day is 17% and liderar's is 18%, when an
 * even split across seven days already gives 14.3%. That is not "their day". A
 * weekly author who always publishes on the same day lands above 80%.
 */
export const DAY_MIN_SHARE = 0.4;
/**
 * Minimum for the smaller side before the free/paid split says anything.
 *
 * Measured: liderar is 281 of 281 free. "100% free" is the absence of a metric,
 * not a metric.
 */
export const PAID_MIN_SHARE = 0.05;
/** A word has to appear in three headlines to be "one of their words". */
export const WORD_MIN_POSTS = 3;
/** Minimum concentration in a three-hour window for the hour to be a fact. */
export const HOUR_MIN_SHARE = 0.5;
/** Minimum weight of a headline tic (question, number, colon). */
export const SIGNATURE_MIN_SHARE = 0.2;
/**
 * The divisor for the equivalence in books.
 *
 * This is a COMPARISON, not a Substack figure, so the page **always shows this
 * number**. Without the divisor in plain sight it would be an estimate dressed
 * up as a fact, which is exactly what we don't do.
 */
export const WORDS_PER_NOVEL = 80_000;

const WEEK_MS = 7 * 86400000;

/** Everything that is their own work. A `restack` is SOMEONE ELSE'S post. */
export function ownPosts(posts: ArchivePost[]): ArchivePost[] {
	return posts.filter((p) => p.type !== 'restack' && p.date);
}

/** Their own posts with a trustworthy date: from `created_at` onwards. */
export function datedPosts(posts: ArchivePost[], createdAt: string): ArchivePost[] {
	const floor = createdAt || '';
	return ownPosts(posts)
		.filter((p) => !floor || p.date >= floor)
		.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Absolute ISO week index.
 *
 * Absolute rather than "year + week number" so two consecutive weeks straddling
 * December and January come out consecutive. Normalised to the Thursday of its
 * ISO week, which is the definition.
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

/** The longest run of consecutive weeks publishing. */
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
 * The run that is still alive.
 *
 * Zero if the last week with a post is neither this one nor the previous one: a
 * week of grace, because someone who publishes on Fridays hasn't broken
 * anything by Monday.
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
	/** Posts per active month, to one decimal. */
	perMonth: number;
	/** The current year always looks short. Without this label the bar lies. */
	inProgress: boolean;
};

export function postsByYear(posts: ArchivePost[], now: Date): YearCadence[] {
	const months = new Map<number, Set<string>>();
	const counts = new Map<number, number>();
	for (const p of posts) {
		const year = Number(p.date.slice(0, 4));
		counts.set(year, (counts.get(year) ?? 0) + 1);
		if (!months.has(year)) months.set(year, new Set());
		months.get(year)!.add(p.date.slice(5, 7));
	}
	return [...counts.keys()]
		.sort((a, b) => a - b)
		.map((year) => {
			const monthsActive = months.get(year)!.size;
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
 * The weekday, **only if it dominates**. `null` when it's noise.
 *
 * Computed in UTC. An author publishing at 20:00 in New York lands on the next
 * day in UTC; the page says so rather than hiding it.
 */
export function topDay(posts: ArchivePost[]): TopDay | null {
	if (posts.length < MIN_POSTS) return null;
	const counts = new Map<number, number>();
	for (const p of posts) {
		const day = new Date(p.date).getUTCDay();
		counts.set(day, (counts.get(day) ?? 0) + 1);
	}
	const [weekday, posts_] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
	const share = posts_ / posts.length;
	return share >= DAY_MIN_SHARE ? { weekday, posts: posts_, share } : null;
}

export type FreePaid = { free: number; paid: number; freeShare: number };

/** The free/paid split, only if there is a real mix. */
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
	 * If the date predates `created_at` it comes from an import and is not
	 * shown: we are not going to sign off on "18 February 2000".
	 */
	showDate: boolean;
};

/**
 * The ceiling for one metric across ALL of their own posts. `null` if the max
 * is 0.
 *
 * Deliberately ignores the date: likes and comments accrue on Substack whatever
 * date a post claims, so an imported post can legitimately be the most liked.
 */
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

/**
 * Filler words from BOTH languages at once, always.
 *
 * Publications come in Spanish and in English (measured: `language` is 'es' on
 * two of the three reference publications and 'en' on the other), but the list
 * is deliberately not chosen by language: headlines mix, and a Spanish-only list
 * would let "the" through in an English headline. That is why `topWords` does
 * not take a language — it would have no use for it.
 */
const STOPWORDS = new Set(
	`el la los las un una unos unas de del al a y o u que en por para con sin sobre entre es son ser
	 su sus lo le les mi tu se me te no ni como mas muy ya pero si cuando donde quien esta este esto
	 the of and to in for is on it this that you your we i my what how why when a an be are was as at
	 from or not with by`
		.split(/\s+/)
		.filter(Boolean)
);

/**
 * Lowercased and unaccented, to group variants of the same word.
 *
 * The range is written with escapes rather than literal combining marks: those
 * are invisible in an editor and get mangled by tooling that normalises source.
 */
function fold(word: string): string {
	return word
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '');
}

export type TopWord = { word: string; posts: number };

/**
 * The words they repeat most in their headlines.
 *
 * Counts **posts, not occurrences**: a word repeated four times in a single
 * headline is not one of their subjects, it's an anaphora.
 *
 * Grouped without accents so "negociación" and "negociacion" are the same word,
 * and the form they use most is returned rather than the folded one: on the card
 * it appears written the way they write it.
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

export type HeadlineSignature = {
	kind: 'question' | 'number' | 'colon';
	share: number;
	posts: number;
};

export type HeadlineStats = {
	/** Minor figure: it flatters nobody and situates nobody, but it was asked for. */
	averageLength: number;
	signature: HeadlineSignature | null;
};

/**
 * The shape of their headlines.
 *
 * Measured, and that is why it carries a threshold: questions are 16% on two
 * different publications and 0% on the third; colons are 27% on liderar and 4%
 * on The Honest Broker. Only the dominant tic is shown, and only if it weighs.
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
 * The hour they publish at, in a three-hour window, and only if concentrated.
 *
 * Measured: Kloshletter has 93% between 05h and 06h UTC — that is a signature —
 * and liderar spreads its maximum across 10%, which is nothing.
 *
 * This is UTC. The page says so; see the comment on `topDay`.
 */
export function topHour(posts: ArchivePost[]): TopHour | null {
	if (posts.length < MIN_POSTS) return null;
	const byHour = new Array(24).fill(0);
	for (const p of posts) byHour[new Date(p.date).getUTCHours()]++;

	let best = { hour: 0, count: -1 };
	for (let h = 0; h < 24; h++) {
		// Three-hour window centred on h, wrapping around midnight.
		const window = byHour[(h + 23) % 24] + byHour[h] + byHour[(h + 1) % 24];
		if (window > best.count) best = { hour: h, count: window };
	}
	const share = best.count / posts.length;
	return share >= HOUR_MIN_SHARE ? { hour: best.hour, share: Math.round(share * 100) / 100 } : null;
}

export type Aggregates = {
	words: number;
	reactions: number;
	/** Comments and replies added together: the whole conversation. */
	conversation: number;
	/** `null` when there are no words, which is what happens coming from RSS. */
	novels: number | null;
};

/**
 * The sums Substack only ever shows post by post.
 *
 * This is the best flattery these data hold, and it comes out clean:
 * `wordcount` is present in 868/868, 128/128 and 167/167 posts of the three
 * reference publications, without a single zero.
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

/** One row per year, 53 cells, true where at least one post landed. */
export function heatmapRows(posts: ArchivePost[]): HeatmapRow[] {
	const years = new Map<number, boolean[]>();
	for (const p of posts) {
		const date = new Date(p.date);
		const year = date.getUTCFullYear();
		if (!years.has(year)) years.set(year, new Array(53).fill(false));
		// Week of the year from the absolute index, so it lines up with the streak.
		const first = weekIndex(new Date(Date.UTC(year, 0, 4)));
		const slot = weekIndex(date) - first;
		if (slot >= 0 && slot < 53) years.get(year)![slot] = true;
	}
	return [...years.keys()].sort((a, b) => a - b).map((year) => ({ year, weeks: years.get(year)! }));
}

export type Metrics = {
	pub: PubInfo;
	/** Their own posts with a trustworthy date. This is the number shown. */
	totalPosts: number;
	/** Their own posts in total, imports included. For the footnote. */
	totalOwnPosts: number;
	firstPostDate: string;
	lastPostDate: string;
	longestStreak: number;
	currentStreak: number;
	/** True when the live streak IS the all-time record. It writes itself. */
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

/** The whole summary. `null` when there isn't enough archive for a card. */
export function computeMetrics(posts: ArchivePost[], pub: PubInfo, now: Date): Metrics | null {
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
