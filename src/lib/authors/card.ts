import type { Metrics } from './metrics';
import type { Lines } from './lines';

/**
 * The card's PNGs, as satori element trees.
 *
 * There are two:
 *
 *  - `squareCardTree` (1080×1080) — the DOWNLOAD. A poster, not a report: one
 *    hero figure chosen by rule, the heatmap as the fingerprint painted in the
 *    publication's own accent, a few earned chips, and no sentences. Square
 *    because that is what travels on Substack Notes, X and Instagram.
 *  - `cardTree` (1200×630) — the page's `og:image` only. Link previews are
 *    landscape; feeds are not.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT TO KNOW BEFORE TOUCHING THIS (all of it learned in /og)
 *
 *  - This is satori, not a browser: it accepts a SUBSET of CSS and does not read
 *    `app.css`. The colours are repeated here as constants; if the theme's
 *    palette changes, change them here too.
 *  - There is no JSX in SvelteKit, so the tree is written by hand as
 *    `{ type, props }`, exactly like `src/routes/og/[slug].png/+server.ts`.
 *  - `div`s need an explicit `display: flex` almost everywhere.
 *  - The font goes in as `.woff` (satori does NOT read the `.woff2` the site
 *    uses) from `$lib/server/fonts/`. Weights 400 and 700 only.
 *
 * The images deliberately do NOT carry every figure the page shows: there is no
 * room, and a crowded image is unreadable on a phone. The page is the complete
 * version.
 * ─────────────────────────────────────────────────────────────────────────
 */

const INK = '#171717';
const SOFT = '#525252';
const MUTED = '#737373';
const LINE = '#e5e5e5';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const SQUARE_SIZE = 1080;

/**
 * The streak only earns the hero spot from here up. Mirrors `STREAK_MID` in
 * lines.ts: below it, a streak flatters nobody.
 */
const HERO_STREAK_MIN = 50;

/** Plural weekday chips: «los martes». Indexed by `getUTCDay()`. */
const WEEKDAYS_PLURAL = [
	'los domingos',
	'los lunes',
	'los martes',
	'los miércoles',
	'los jueves',
	'los viernes',
	'los sábados'
];

export type Hero = {
	value: string;
	label: string;
	/** True when the hero is a streak that is alive right now. */
	live: boolean;
};

/**
 * The one figure that gets the poster treatment: the record streak if it earns
 * it, the post count otherwise. Volume of work first — likes, comments and
 * restacks come right under as the reaction to it.
 */
export function heroFor(m: Metrics): Hero {
	if (m.streakIsRecord && m.longestStreak >= HERO_STREAK_MIN) {
		return { value: es(m.longestStreak), label: 'semanas seguidas publicando', live: true };
	}
	return {
		value: es(m.totalPosts),
		label: m.totalPosts === 1 ? 'artículo' : 'artículos',
		live: false
	};
}

export type Stat = { value: string; label: string };

/**
 * The reaction row under the hero: likes, comments, restacks — what readers
 * did with the work. Only earned figures — a zero is dropped, never shown.
 */
export function statsFor(m: Metrics): Stat[] {
	const stats: Stat[] = [];
	if (m.aggregates.reactions > 0) {
		stats.push({ value: compact(m.aggregates.reactions), label: 'likes' });
	}
	if (m.aggregates.conversation > 0) {
		stats.push({ value: compact(m.aggregates.conversation), label: 'comentarios' });
	}
	if (m.aggregates.restacks > 0) {
		stats.push({ value: compact(m.aggregates.restacks), label: 'restacks' });
	}
	return stats;
}

/**
 * The chart's caption. The publishing day, when it earned its ≥40% share in
 * metrics.ts, rides along here instead of having a chip row of its own: one
 * habit doesn't deserve a whole band.
 */
export function chartCaption(m: Metrics): string {
	const base = 'likes + comentarios + restacks';
	return m.day ? `${base} · publica ${WEEKDAYS_PLURAL[m.day.weekday]}` : base;
}

/** A wash of the accent for tinted surfaces; falls back to a neutral wash. */
function tint(accent: string): string {
	return /^#[0-9a-f]{6}$/i.test(accent) ? `${accent}26` : 'rgba(23, 23, 23, 0.06)';
}

/**
 * Compact Spanish figures: full up to four digits, then «mil» and «M». A
 * number that doesn't read at a glance isn't a poster figure.
 */
export function compact(n: number): string {
	const one = (x: number) =>
		(Math.round(x * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });
	if (n < 10_000) return es(n);
	if (n < 1_000_000) return `${one(n / 1000)} mil`;
	return `${one(n / 1_000_000)} M`;
}

/** Substack's own subscriber magnitude («7.7K+») said in Spanish («7,7 mil+»). */
export function spanishMagnitude(raw: string): string {
	const match = raw.match(/^([\d.]+)K(\+?)$/i);
	if (!match) return raw;
	return `${match[1].replace('.', ',')} mil${match[2]}`;
}

/**
 * The publication's accent, unless it is too pale to hold a bar on white — a
 * washed-out chart reads as broken, and the colour is not ours to fix. Below
 * the luminance bar, the fallback wins. Non-hex colours also fall back: they
 * can't be checked.
 */
export function safeAccent(color: string | null, fallback: string): string {
	const hex = color?.match(/^#([0-9a-f]{6})$/i)?.[1];
	if (!hex) return fallback;
	const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance > 0.72 ? fallback : color!;
}

/**
 * The site's four-pointed star, drawn as SVG: the Inter subset in the PNG has
 * no ✦ glyph (it rendered as a tofu box), and this way it is the exact same
 * path as the header mark in +layout.svelte.
 */
function star(size: number, color: string): Node {
	return {
		type: 'svg',
		props: {
			width: size,
			height: size,
			viewBox: '0 0 24 24',
			children: [
				{
					type: 'path',
					props: { d: 'M12 1 Q13.6 9.4 23 12 Q13.6 14.6 12 23 Q10.4 14.6 1 12 Q10.4 9.4 12 1 Z', fill: color }
				}
			]
		}
	};
}

/** Four figures fit across the width. More than that and they stop being big. */
const MAX_STATS = 4;
/** Rows of heatmap that fit under the figures without crowding them. */
const MAX_HEATMAP_ROWS = 6;

const es = (n: number) => n.toLocaleString('es-ES');

type Node = Record<string, unknown>;

function div(style: Record<string, unknown>, children: unknown): Node {
	return { type: 'div', props: { style: { display: 'flex', ...style }, children } };
}

function stat(value: string, label: string): Node {
	return div({ flexDirection: 'column', gap: 6 }, [
		div({ fontSize: 60, fontWeight: 700, color: INK, lineHeight: 1 }, value),
		div({ fontSize: 20, color: MUTED }, label)
	]);
}

/** The heatmap. This is the part that reads at a glance. */
function heatmap(metrics: Metrics, options?: { cell?: number; rows?: number; accent?: string }): Node {
	const cell = options?.cell ?? 8;
	const rows = options?.rows ?? MAX_HEATMAP_ROWS;
	const on = options?.accent ?? INK;
	return div(
		{ flexDirection: 'column', gap: Math.max(3, Math.round(cell / 3)) },
		metrics.heatmap.slice(-rows).map((row) =>
			div({ alignItems: 'center', gap: 10 }, [
				div({ fontSize: cell * 2 + 2, color: MUTED, width: cell * 6 }, String(row.year)),
				div(
					{ gap: 2 },
					row.weeks.map((active) =>
						div(
							{
								width: cell,
								height: cell,
								borderRadius: Math.max(2, Math.round(cell / 5)),
								backgroundColor: active ? on : LINE
							},
							[]
						)
					)
				)
			])
		)
	);
}

export type SquareCardOptions = {
	/** The publication's accent colour; any CSS colour string. */
	accent: string;
	/** The publication logo as a data URI, or null to draw the initial instead. */
	avatar: string | null;
	/** The author's own photo as a data URI, or null to show just the name. */
	authorPhoto: string | null;
	/** The author's follower count from their public profile; null hides it. */
	followers: number | null;
	/** The card's own address at the foot, e.g. «damiansoto.me/author/kloshletter». */
	signature: string;
};

/** The avatar, or a tinted square with the publication's initial. */
function avatarNode(metrics: Metrics, options: SquareCardOptions): Node {
	if (options.avatar) {
		return {
			type: 'img',
			props: {
				src: options.avatar,
				width: 136,
				height: 136,
				style: { borderRadius: 30 }
			}
		};
	}
	const initial = (metrics.pub.name[0] ?? '').toUpperCase();
	return div(
		{
			width: 136,
			height: 136,
			borderRadius: 30,
			backgroundColor: tint(options.accent),
			alignItems: 'center',
			justifyContent: 'center',
			fontSize: 64,
			fontWeight: 700,
			color: INK
		},
		initial ? initial : [star(56, INK)]
	);
}

/** Three-letter Spanish month initials for the chart's axis. */
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * The interactions chart: one bar per month of likes + comments + restacks
 * added together, last 12 months, in the publication's accent. The best month
 * carries its total so the bars have a scale.
 */
function engagementChart(metrics: Metrics, accent: string): Node {
	const months = metrics.engagement;
	const totals = months.map((m) => m.likes + m.comments + m.restacks);
	const max = Math.max(...totals, 1);
	const CHART_HEIGHT = 150;
	const best = totals.indexOf(Math.max(...totals));

	return div({ flexDirection: 'column', gap: 16, alignItems: 'center' }, [
		div(
			{ alignItems: 'flex-end', gap: 18 },
			months.map((month, index) => {
				const barH = Math.round((totals[index] / max) * CHART_HEIGHT);
				return div({ flexDirection: 'column', alignItems: 'center', gap: 10, width: 58 }, [
					div(
						{
							flexDirection: 'column',
							justifyContent: 'flex-end',
							alignItems: 'center',
							height: CHART_HEIGHT + 34,
							gap: 6
						},
						[
							index === best && totals[best] > 0
								? div(
										{ fontSize: 22, fontWeight: 700, color: INK, whiteSpace: 'nowrap' },
										`${MONTHS_SHORT[Number(months[best].month.slice(5, 7)) - 1]} · ${compact(totals[best])}`
									)
								: div({ height: 22 }, []),
							div(
								{
									width: 58,
									height: Math.max(barH, 4),
									backgroundColor: accent,
									borderRadius: '6px 6px 0 0'
								},
								[]
							)
						]
					),
					div(
						{ fontSize: 20, color: MUTED },
						MONTHS_SHORT[Number(month.month.slice(5, 7)) - 1]
					)
				]);
			})
		),
		div({ fontSize: 21, color: MUTED }, chartCaption(metrics))
	]);
}

/**
 * The downloadable square (1080×1080): a poster, not a report.
 *
 * Top to bottom: the accent band; the publication's identity with its address
 * right there (the author's photo and name under the title); the hero figure;
 * the reaction row — likes, comments, restacks, what readers DID with the
 * work; the earned chips; the engagement chart; and the card's own URL at the
 * foot, so the image leads back to the tool. No sentences.
 */
export function squareCardTree(metrics: Metrics, options: SquareCardOptions): Node {
	const hero = heroFor(metrics);
	const stats = statsFor(metrics);

	const header = div({ alignItems: 'center', gap: 30 }, [
		avatarNode(metrics, options),
		div({ flexDirection: 'column', gap: 8 }, [
			/* The age rides with the title: it frames everything under it. */
			div({ alignItems: 'baseline', gap: 18 }, [
				div(
					{
						fontSize: 52,
						fontWeight: 700,
						color: INK,
						lineHeight: 1.06,
						display: 'block',
						lineClamp: 1,
						maxWidth: 620
					},
					metrics.pub.name
				),
				div(
					{ fontSize: 26, color: MUTED },
					`desde ${new Date(metrics.firstPostDate).getUTCFullYear()}`
				)
			]),
			div(
				{ alignItems: 'center', gap: 12 },
				[
					options.authorPhoto
						? {
								type: 'img',
								props: {
									src: options.authorPhoto,
									width: 48,
									height: 48,
									style: { borderRadius: 999 }
								}
							}
						: null,
					div(
						{ fontSize: 26, color: SOFT },
						[
							metrics.pub.authorName,
							options.followers ? `${compact(options.followers)} seguidores` : '',
							new URL(metrics.pub.origin).host
						]
							.filter(Boolean)
							.join(' · ')
					)
				].filter(Boolean)
			)
		])
	]);

	/* The data block is centred: the poster's axis. The publication's
	   subscribers ride with the hero label — audience next to output — and only
	   when the author's own setting allows it (see PubInfo.subscriberMagnitude). */
	const heroLabel = [
		hero.label,
		metrics.pub.subscriberMagnitude
			? `${spanishMagnitude(metrics.pub.subscriberMagnitude)} suscriptores`
			: ''
	]
		.filter(Boolean)
		.join(' · ');
	const heroBlock = div({ flexDirection: 'column', alignItems: 'center', gap: 10 }, [
		div(
			{ fontSize: 172, fontWeight: 700, color: INK, lineHeight: 1, letterSpacing: '-0.03em' },
			hero.value
		),
		div(
			{ alignItems: 'baseline', gap: 18 },
			[
				div({ fontSize: 33, color: SOFT }, heroLabel),
				hero.live
					? div({ fontSize: 33, fontWeight: 700, color: options.accent }, 'y sigue')
					: null
			].filter(Boolean)
		)
	]);

	/* Three uniform columns, text centred: each reaction weighs the same. */
	const statsRow = div(
		{ width: '100%' },
		stats.map((stat) =>
			div({ flexDirection: 'column', alignItems: 'center', gap: 8, flexGrow: 1, flexBasis: 0 }, [
				div({ fontSize: 76, fontWeight: 700, color: INK, lineHeight: 1 }, stat.value),
				div({ fontSize: 26, color: MUTED }, stat.label)
			])
		)
	);

	return div(
		{
			width: '100%',
			height: '100%',
			flexDirection: 'column',
			justifyContent: 'space-between',
			backgroundColor: '#ffffff',
			padding: '72px 84px 56px',
			fontFamily: 'Inter',
			position: 'relative'
		},
		[
			/* The accent band: the publication's colour owns the top edge. */
			div(
				{
					position: 'absolute',
					top: 0,
					left: 0,
					width: SQUARE_SIZE,
					height: 14,
					backgroundColor: options.accent
				},
				[]
			),
			header,
			heroBlock,
			stats.length ? statsRow : div({}, []),
			engagementChart(metrics, options.accent),
			div({ alignItems: 'center', justifyContent: 'center', gap: 10 }, [
				star(22, MUTED),
				div({ fontSize: 24, color: MUTED, fontWeight: 700 }, options.signature)
			])
		]
	);
}

export function cardTree(metrics: Metrics, lines: Lines, signature: string): Node {
	const stats: Node[] = [
		stat(es(metrics.totalPosts), 'posts'),
		stat(es(metrics.longestStreak), 'semanas seguidas')
	];
	if (metrics.aggregates.words > 0) stats.push(stat(es(metrics.aggregates.words), 'palabras'));
	if (metrics.aggregates.reactions > 0) stats.push(stat(es(metrics.aggregates.reactions), 'likes'));

	// The sentence at the foot is whichever one exists, in order of how much it
	// flatters. All of them can be null — see the rule in `lines.ts` — and then
	// the foot simply carries the signature alone.
	const closing = lines.streak ?? lines.words ?? lines.cadence ?? '';

	return div(
		{
			width: '100%',
			height: '100%',
			flexDirection: 'column',
			justifyContent: 'space-between',
			backgroundColor: '#ffffff',
			padding: '60px 72px',
			fontFamily: 'Inter'
		},
		[
			div({ flexDirection: 'column', gap: 8 }, [
				div({ fontSize: 46, fontWeight: 700, color: INK, lineHeight: 1.1 }, metrics.pub.name),
				div({ fontSize: 22, color: SOFT }, metrics.pub.authorName)
			]),
			div({ gap: 56 }, stats.slice(0, MAX_STATS)),
			heatmap(metrics),
			div({ alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }, [
				// The card can't grow, so a long sentence is clamped rather than
				// pushing the signature off the image.
				div({ fontSize: 19, color: MUTED, display: 'block', lineClamp: 2, maxWidth: 760 }, closing),
				div({ fontSize: 19, color: MUTED }, signature)
			])
		]
	);
}
