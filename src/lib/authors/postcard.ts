import type { Metrics } from './metrics';

/**
 * The four postcards, as satori element trees.
 *
 * They come from a Claude Design handoff («Rediseño postal Substack») and keep
 * its language faithfully. The design language is the POSTCARD's, not the
 * site's: Space Grotesk / Instrument Serif / JetBrains Mono, a fixed orange
 * `#f05a1e`, and a faceted diamond mark. The palette deliberately does NOT
 * adapt to the publication's brandColor — every postcard also advertises the
 * tool, and the fixed identity is what makes them recognisable in a feed.
 *
 * THE CANVAS IS PORTRAIT 1080×1350 (4:5). See POSTCARD_WIDTH for the measured
 * reason — it is the one ratio that Substack Notes, LinkedIn and X all agree on.
 *
 * THE TYPE SCALE (design units; output is 1:1 with them now).
 *
 * It was raised across the board with the ratio change, and NOT because the old
 * sizes were too small: a note is width-limited on a phone either way, so 310 CSS
 * px is what both ratios get and the type reads at the same size. The scale grew
 * because a portrait canvas has 573 more design px of height, and spending them
 * on air instead of on type would have bought presence in the scroll without
 * buying legibility.
 *
 *   months 21 · labels 24/500 · mono eyebrows 19-20 · body 26-29 — the smallest
 *   text is ~1.8% of the canvas width, up from 1.4%. Stat and month labels share
 *   ONE voice across the four variants (size, weight and contrast), whatever the
 *   ground. Values: stack 74-78 / secondary 80 / leads 98 / cartel giant 400
 *   (stepping down for long magnitudes). Serif displays 88-132. Letter-spacing
 *   keeps its em ratio (−0.04em on values) at every size.
 *
 * The bar charts do NOT scale with the canvas: a column is drawn at the
 * `maxHeight` handed to `barColumn` and sits on the baseline, so growing the
 * canvas leaves it floating unless that number is raised by hand. Each variant
 * carries its own, measured against the block it actually gets.
 *
 * Same satori caveats as before (learned the hard way, see git history):
 * subset of CSS, explicit `display: flex`, fonts as TTF from
 * `$lib/server/fonts/`, letter-spacing in px, NEVER an `undefined` style
 * value (it kills the render with an empty reply and no stack), and no
 * `transform: scale()` around images (satori loses them) — the design→output
 * scaling walks the tree numerically instead.
 */

const ORANGE = '#f05a1e';
const DARK = '#111010';
const DARK_BAND = '#141212';
const CREAM = '#f5f1ea';
const PAPER = '#f6f2ea';
const PAPER_INK = '#171412';
const PAPER_MUTED = '#8a8178';

/*
 * biolink's light ground. Deliberately COOLER and cleaner than gema's warm
 * `PAPER`: two light variants out of four would read as the same postcard twice
 * if they shared a ground. Gema is a printed paper catalogue with hard rules;
 * biolink is a bright screen with soft cards. The layouts differ (centred vs
 * grid), but the ground is what tells them apart at feed size.
 */
const LIGHT = '#fcfbf9';
const LIGHT_LINE = 'rgba(23,20,18,.13)';
const LIGHT_MUTED = '#7d746b';

/*
 * The one label voice, shared by the four variants: same size, same weight,
 * per-ground contrast. Months use the same weight one step smaller.
 */
const LABEL_SIZE = 20;
const MONTH_SIZE = 17;
const LABEL_ON_DARK = 'rgba(245,241,234,.78)';
const LABEL_ON_DARK_STRONG = 'rgba(245,241,234,.9)';
const MONTH_ON_DARK = 'rgba(245,241,234,.65)';
/** Stronger than PAPER_MUTED: labels must read from the feed. */
const LABEL_ON_PAPER = '#6f665c';

/**
 * The published size: 1080×1350 (4:5), PORTRAIT. It used to be landscape
 * 1456×1048 (14:10), picked so a postcard pasted into a POST landed full-width
 * without the editor's manual toggle. That was the wrong target: these are
 * shared in Notes, and taken to LinkedIn and X. All three are mobile feeds.
 *
 * Measured from Substack's own `reader2` CSS (August 2026), a single-image note
 * renders into a CONTAIN box — the CDN asks for `c_limit` with no `h_`, so a
 * note image is never cropped, only fitted:
 *
 *     .imageGrid.size-1 .imageBubble {
 *       aspect-ratio: <source>; max-width: var(--max-width);
 *       max-height: var(--single-image-max-height);
 *     }
 *     desktop feed 520×420 · permalink 568×420
 *     @media (max-width: 600px) → (100vw − 80px) × 400
 *
 * THE 400px HEIGHT CAP IS THE WHOLE STORY. Landscape can't reach it: 14:10 on a
 * 390px phone painted 310×223, using 56% of the height available to it. 4:5
 * paints 310×388 — 97%, and +74% of vertical presence in the scroll for free.
 *
 * Why 4:5 exactly, and not taller: past ~3:4 you are already against the 400px
 * cap, so extra height buys nothing and only costs width (2:3 renders 267px
 * wide — narrower than 4:5 and not one pixel taller). And 4:5 is the tallest
 * LinkedIn and X display without cropping. Three platforms, one ratio.
 *
 * The cost, accepted deliberately: Substack's DESKTOP note box is landscape, so
 * 4:5 fills 59-65% there, and a postcard dropped into a post at full width gets
 * cropped to 1:1. 1:1 is the best compromise if that ever becomes the priority
 * (it never drops below 70% anywhere) — but it wastes ~20% of the feed height on
 * LinkedIn and X, and four of the five measured contexts are mobile.
 *
 * 1080×1350 is also exactly what LinkedIn and X document for portrait, and it
 * covers every render: the biggest a note is ever shown is 336 CSS px wide at
 * DPR 3 ≈ 1008.
 */
export const POSTCARD_WIDTH = 1080;
export const POSTCARD_HEIGHT = 1350;

/**
 * The design's own coordinate space. The handoff speaks in a 1080-wide canvas
 * and the trees still do, so SCALE is currently 1 and the walk below is an
 * identity. It stays because the published size must be able to move again
 * without touching a single number inside the four trees.
 */
const DESIGN_WIDTH = 1080;
const SCALE = POSTCARD_WIDTH / DESIGN_WIDTH;
const DESIGN_HEIGHT = POSTCARD_HEIGHT / SCALE;

/** Slider (and slug) order: the handoff's most recent turn first. */
export const POSTCARD_VARIANTS = ['biolink', 'editorial', 'gema', 'cartel'] as const;
export type PostcardVariant = (typeof POSTCARD_VARIANTS)[number];

const es = (n: number) => n.toLocaleString('es-ES');

/**
 * Compact Spanish figures: full up to four digits, then «K» and «M» — glued
 * to the number, never a space: «54,9 mil» line-wrapped inside narrow stat
 * cells, «54,9K» cannot.
 */
export function compact(n: number): string {
	const one = (x: number) =>
		(Math.round(x * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });
	if (n < 10_000) return es(n);
	if (n < 1_000_000) return `${one(n / 1000)}K`;
	return `${one(n / 1_000_000)}M`;
}

/** Substack's own subscriber magnitude («7.7K+») with the Spanish comma («7,7K+»). */
export function spanishMagnitude(raw: string): string {
	const match = raw.match(/^([\d.]+)K(\+?)$/i);
	if (!match) return raw;
	return `${match[1].replace('.', ',')}K${match[2]}`;
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_FULL = [
	'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
	'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/** A month bar keeps its share of the peak; the tree scales it to pixels. */
export type PostcardBar = { month: string; share: number; solid: boolean };
export type PostcardStat = { value: string; label: string };

export type PostcardData = {
	name: string;
	authorName: string;
	/** «DS» — the prototype's avatar fallback. */
	initials: string;
	sinceYear: number;
	/** The article count, always present; several variants give it the big slot. */
	articles: string;
	/**
	 * The earned reaction figures, zeros dropped: subscribers first (the
	 * highlighted cell), then likes, comments, restacks. The grids flex.
	 */
	stats: PostcardStat[];
	bars: PostcardBar[];
	/** «jun · 51», or null when no month has interactions. */
	peak: string | null;
	/** «pico en junio · 51» — the gema variant says it in words. */
	peakLong: string | null;
	/** «119 seguidores», or null when the profile could not be read. */
	followers: string | null;
	pubHost: string;
};

/**
 * The share of the peak a month needs for a solid bar. The prototype used
 * `v > 10` against a peak of 51 — one fifth.
 */
const SOLID_SHARE = 0.2;

/** Everything the four trees paint, computed once. Pure and tested. */
export function postcardData(metrics: Metrics, followers: number | null): PostcardData {
	const totals = metrics.engagement.map((m) => m.likes + m.comments + m.restacks);
	const max = Math.max(...totals, 1);
	const peakIndex = totals.indexOf(Math.max(...totals));
	const peakMonth = metrics.engagement[peakIndex]
		? Number(metrics.engagement[peakIndex].month.slice(5, 7)) - 1
		: 0;
	const hasPeak = totals[peakIndex] > 0;

	const stats: PostcardStat[] = [];
	if (metrics.pub.subscriberMagnitude) {
		stats.push({ value: spanishMagnitude(metrics.pub.subscriberMagnitude), label: 'suscriptores' });
	}
	if (metrics.aggregates.reactions > 0) {
		stats.push({ value: compact(metrics.aggregates.reactions), label: 'likes' });
	}
	if (metrics.aggregates.conversation > 0) {
		stats.push({ value: compact(metrics.aggregates.conversation), label: 'comentarios' });
	}
	if (metrics.aggregates.restacks > 0) {
		stats.push({ value: compact(metrics.aggregates.restacks), label: 'restacks' });
	}

	const initials = metrics.pub.authorName
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0].toUpperCase())
		.join('');

	return {
		name: metrics.pub.name,
		authorName: metrics.pub.authorName,
		initials: initials || '·',
		sinceYear: new Date(metrics.firstPostDate).getUTCFullYear(),
		articles: compact(metrics.totalPosts),
		stats,
		bars: metrics.engagement.map((m, i) => ({
			month: MONTHS_SHORT[Number(m.month.slice(5, 7)) - 1],
			share: totals[i] / max,
			solid: totals[i] > 0 && totals[i] / max > SOLID_SHARE
		})),
		peak: hasPeak ? `${MONTHS_SHORT[peakMonth]} · ${compact(totals[peakIndex])}` : null,
		peakLong: hasPeak ? `pico en ${MONTHS_FULL[peakMonth]} · ${compact(totals[peakIndex])}` : null,
		followers: followers ? `${compact(followers)} seguidores` : null,
		pubHost: new URL(metrics.pub.origin).host
	};
}

export type PostcardOptions = {
	/** The author's photo as a data URI; null draws the initials circle. */
	avatar: string | null;
	/**
	 * The PUBLICATION's logo as a data URI. The handoff drew a faceted diamond
	 * there because the mock was Objeto Brillante, whose logo IS a diamond —
	 * the slot belongs to each newsletter's own logo, and the drawn diamond
	 * survives only as the fallback when a publication has none.
	 */
	logo: string | null;
	/** «damiansoto.me/postcard/{slug}» — the image leads back to the tool. */
	toolUrl: string;
};

type Node = Record<string, unknown>;

function div(style: Record<string, unknown>, children: unknown): Node {
	return { type: 'div', props: { style: { display: 'flex', ...style }, children } };
}

/** The faceted diamond mark, in each variant's own colouring. */
function diamond(
	size: number,
	outer: { fill?: string; stroke?: string; strokeWidth?: number },
	inner: { stroke: string; strokeWidth: number; opacity?: number }
): Node {
	return {
		type: 'svg',
		props: {
			width: size,
			height: size,
			viewBox: '0 0 100 100',
			children: [
				{
					type: 'path',
					props: {
						d: 'M20 36 L50 8 L80 36 L50 92 Z',
						fill: outer.fill ?? 'none',
						stroke: outer.stroke,
						'stroke-width': outer.strokeWidth
					}
				},
				{
					type: 'path',
					props: {
						d: 'M20 36 H80 M50 8 L38 36 L50 92 M50 8 L62 36 L50 92',
						fill: 'none',
						stroke: inner.stroke,
						'stroke-width': inner.strokeWidth,
						opacity: inner.opacity ?? 1
					}
				}
			]
		}
	};
}

/** The publication's logo in the mark slot; the drawn diamond as fallback. */
function logoMark(options: PostcardOptions, size: number, fallback: () => Node): Node {
	if (options.logo) {
		return {
			type: 'img',
			props: {
				src: options.logo,
				width: size,
				height: size,
				style: { borderRadius: Math.round(size * 0.18) }
			}
		};
	}
	return fallback();
}

/** The author's photo in a circle, or the prototype's initials fallback. */
function avatarCircle(
	data: PostcardData,
	options: PostcardOptions,
	size: number,
	style: { background: string; border?: string; color: string; fontSize: number }
): Node {
	/* Satori chokes on `undefined` style values: only set keys that exist. */
	const border = style.border ? { border: style.border } : {};
	if (options.avatar) {
		return {
			type: 'img',
			props: {
				src: options.avatar,
				width: size,
				height: size,
				style: { borderRadius: 999, ...border }
			}
		};
	}
	return div(
		{
			width: size,
			height: size,
			borderRadius: 999,
			background: style.background,
			...border,
			alignItems: 'center',
			justifyContent: 'center',
			fontSize: style.fontSize,
			fontWeight: 500,
			color: style.color
		},
		data.initials
	);
}

/**
 * How wide a single bar may get, whatever room its column has.
 *
 * The columns are `flex: 1`, so the chart used to assume twelve of them — at
 * that count each bar lands around 70px and nothing needed a cap. The window
 * is no longer fixed at twelve (see `monthlyEngagement`), and a publication
 * three months old was drawing three 330px slabs: not a chart, a flag. The cap
 * leaves every twelve-bar card byte-identical and only bites when the bars are
 * few, where it keeps their shape and spreads them evenly instead.
 */
const BAR_MAX_WIDTH = 120;

/** One bar column; label optional (biolink and cartel label outside the bars). */
function barColumn(bar: PostcardBar, maxHeight: number, dim: string, label?: Node): Node {
	const height = Math.max(4, Math.round(bar.share * maxHeight));
	const children: Node[] = [
		div(
			{
				background: bar.solid ? ORANGE : dim,
				height,
				borderRadius: '4px 4px 0 0',
				width: '100%',
				maxWidth: BAR_MAX_WIDTH
			},
			[]
		)
	];
	if (label) children.push(label);
	return div(
		{
			flex: 1,
			flexDirection: 'column',
			justifyContent: 'flex-end',
			alignItems: 'center',
			height: '100%',
			gap: 8
		},
		children
	);
}

/* ── 2a · biolink — light, centred, cards ──────────────────────────────── */

function biolinkTree(data: PostcardData, options: PostcardOptions): Node {
	/* The article count joins the stat row here; subscribers keep the lead. */
	const cells: PostcardStat[] = [
		...data.stats.slice(0, 1),
		{ value: data.articles, label: data.articles === '1' ? 'artículo' : 'artículos' },
		...data.stats.slice(1)
	];

	/* Identity, data and actions as four blocks: `space-between` shares the
	   canvas out and no dead band opens between chart and signature. On the tall
	   canvas the five stat cards go two rows deep — five across 4:5 would leave
	   each one 170px wide and the labels would wrap. */
	const topRow = cells.slice(0, 2);
	const bottomRow = cells.slice(2);

	const card = (stat: PostcardStat, lead: boolean) =>
		div(
			{
				flex: 1,
				flexDirection: 'column',
				alignItems: 'center',
				border: lead ? '1px solid rgba(240,90,30,.5)' : `1px solid ${LIGHT_LINE}`,
				background: lead ? 'rgba(240,90,30,.07)' : '#fff',
				borderRadius: 24,
				padding: '30px 0 26px'
			},
			[
				div(
					{
						fontWeight: 700,
						fontSize: 78,
						lineHeight: 0.85,
						letterSpacing: -3.1,
						color: lead ? ORANGE : PAPER_INK
					},
					stat.value
				),
				div(
					{
						fontSize: 25,
						fontWeight: 500,
						color: lead ? '#8a4a2c' : LIGHT_MUTED,
						marginTop: 12
					},
					stat.label
				)
			]
		);

	return div(
		{
			width: DESIGN_WIDTH,
			height: DESIGN_HEIGHT,
			background: LIGHT,
			color: PAPER_INK,
			padding: '96px 76px 76px',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'space-between',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: 'Space Grotesk'
		},
		[
			div({ position: 'absolute', top: 0, left: 0, width: DESIGN_WIDTH, height: 10, background: ORANGE }, []),
			/* The warm wash that the dark version got from a glow. On a light
			   ground it has to be far weaker or it reads as a printing fault. */
			div(
				{
					position: 'absolute',
					top: -420,
					left: (DESIGN_WIDTH - 1120) / 2,
					width: 1120,
					height: 1120,
					borderRadius: 9999,
					backgroundImage: 'radial-gradient(circle, rgba(240,90,30,.13), rgba(240,90,30,0) 62%)'
				},
				[]
			),
			div({ flexDirection: 'column', alignItems: 'center' }, [
				div({ position: 'relative' }, [
					avatarCircle(data, options, 158, {
						background: '#f2ece3',
						border: '1px solid rgba(240,90,30,.45)',
						color: ORANGE,
						fontSize: 48
					}),
					div(
						{
							position: 'absolute',
							bottom: -10,
							right: -10,
							width: 74,
							height: 74,
							borderRadius: 999,
							background: LIGHT,
							alignItems: 'center',
							justifyContent: 'center',
							overflow: 'hidden'
						},
						[logoMark(options, 52, () => diamond(50, { fill: ORANGE }, { stroke: LIGHT, strokeWidth: 3 }))]
					)
				]),
				div(
					{
						fontFamily: 'Instrument Serif',
						fontSize: 104,
						lineHeight: 1,
						letterSpacing: -1.6,
						color: PAPER_INK,
						marginTop: 28,
						textAlign: 'center'
					},
					data.name
				),
				div(
					{
						fontFamily: 'JetBrains Mono',
						fontWeight: 500,
						fontSize: 25,
						letterSpacing: 3.4,
						color: ORANGE,
						marginTop: 22
					},
					data.pubHost.toUpperCase()
				),
				div(
					{ fontSize: 29, lineHeight: 1.4, color: LIGHT_MUTED, marginTop: 14 },
					`${data.authorName} · escribiendo desde ${data.sinceYear}`
				)
			]),
			div({ width: '100%', flexDirection: 'column', gap: 18 }, [
				div({ gap: 18, width: '100%' }, topRow.map((stat, index) => card(stat, index === 0))),
				bottomRow.length
					? div({ gap: 18, width: '100%' }, bottomRow.map((stat) => card(stat, false)))
					: div({}, [])
			]),
			div({ width: '100%', flexDirection: 'column' }, [
				data.peak
					? div(
							{
								justifyContent: 'flex-end',
								fontFamily: 'JetBrains Mono',
								fontWeight: 500,
								fontSize: 21,
								color: ORANGE,
								marginBottom: 14
							},
							data.peak
						)
					: div({}, []),
				div(
					{ alignItems: 'flex-end', gap: 10, height: 224 },
					data.bars.map((bar) =>
						barColumn(
							bar,
							172,
							'rgba(240,90,30,.26)',
							div(
								{
									fontSize: 21,
									fontWeight: 500,
									color: LIGHT_MUTED,
									justifyContent: 'center'
								},
								bar.month
							)
						)
					)
				)
			]),
			/* The postcard's own address, plain: a signature, not a button. */
			div(
				{
					width: '100%',
					justifyContent: 'center',
					fontFamily: 'JetBrains Mono',
					fontWeight: 500,
					fontSize: 25,
					letterSpacing: 1.2,
					color: ORANGE
				},
				options.toolUrl
			)
		]
	);
}

/* ── 1a · editorial — dark, typographic ────────────────────────────────── */

function editorialTree(data: PostcardData, options: PostcardOptions): Node {
	/* Subscribers lead the band, highlighted; the article count joins as one
	   figure among equals — same size as every other number. */
	const cells: PostcardStat[] = [
		...data.stats.slice(0, 1),
		{ value: data.articles, label: data.articles === '1' ? 'artículo' : 'artículos' },
		...data.stats.slice(1)
	];
	const statCells = cells.map((stat, index) =>
		div({ flex: index === 0 ? 1.1 : 1, flexDirection: 'column' }, [
			div(
				{
					fontWeight: 700,
					fontSize: 80,
					lineHeight: 0.82,
					letterSpacing: -3.2,
					color: index === 0 ? ORANGE : CREAM
				},
				stat.value
			),
			div(
				{
					fontSize: 24,
					fontWeight: 500,
					color: index === 0 ? LABEL_ON_DARK_STRONG : LABEL_ON_DARK,
					marginTop: 14
				},
				stat.label
			)
		])
	);

	return div(
		{
			width: DESIGN_WIDTH,
			height: DESIGN_HEIGHT,
			background: DARK,
			color: CREAM,
			padding: '84px 72px 76px',
			flexDirection: 'column',
			justifyContent: 'space-between',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: 'Space Grotesk'
		},
		[
			div({ position: 'absolute', top: 0, left: 0, width: DESIGN_WIDTH, height: 8, background: ORANGE }, []),
			div(
				{
					/* Kept clear of the figures on purpose: its lower vertex has to land
					   above the stat band or the diagonal draws a strike-through across
					   a number. At 420 from top −110 it bottoms out around y 397. */
					position: 'absolute',
					right: -150,
					top: -110,
					width: 420,
					height: 420,
					transform: 'rotate(45deg)',
					border: '1px solid rgba(240,90,30,.28)'
				},
				[]
			),
			div({ alignItems: 'flex-start', justifyContent: 'space-between', gap: 32 }, [
				div({ flexDirection: 'column' }, [
					div(
						{
							fontFamily: 'JetBrains Mono',
							fontWeight: 500,
							fontSize: 20,
							letterSpacing: 4.4,
							color: ORANGE,
							marginBottom: 22
						},
						`SUBSTACK · DESDE ${data.sinceYear}`
					),
					div(
						{
							fontFamily: 'Instrument Serif',
							/* Two lines here, not one: a portrait canvas has the height for
							   it and clamping «Tu Plan B» to one line at this size would
							   push the type back down to the landscape scale. */
							fontSize: 132,
							lineHeight: 0.94,
							letterSpacing: -2.6,
							color: '#fff',
							display: 'block',
							lineClamp: 2,
							maxWidth: 760
						},
						data.name
					)
				]),
				div({ flex: 'none', marginTop: 8 }, [
					logoMark(options, 104, () =>
						diamond(104, { stroke: ORANGE, strokeWidth: 3 }, { stroke: 'rgba(240,90,30,.5)', strokeWidth: 1.8 })
					)
				])
			]),
			div(
				{
					alignItems: 'baseline',
					borderTop: '1px solid rgba(245,241,234,.16)',
					borderBottom: '1px solid rgba(245,241,234,.16)',
					padding: '58px 0'
				},
				statCells
			),
			div({ flexDirection: 'column' }, [
				div({ alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }, [
					div(
						{
							fontFamily: 'JetBrains Mono',
							fontWeight: 500,
							fontSize: 19,
							letterSpacing: 3.4,
							color: 'rgba(245,241,234,.45)'
						},
						'INTERACCIONES POR MES'
					),
					div(
						{ fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 19, letterSpacing: 1.1, color: ORANGE },
						data.peak ?? ''
					)
				]),
				div(
					{ alignItems: 'flex-end', gap: 12, height: 420 },
					data.bars.map((bar) =>
						barColumn(
							bar,
							330,
							'rgba(240,90,30,.35)',
							div({ fontSize: 21, fontWeight: 500, color: MONTH_ON_DARK, justifyContent: 'center' }, bar.month)
						)
					)
				)
			]),
			div({ alignItems: 'center', justifyContent: 'space-between', gap: 24, paddingTop: 8 }, [
				div({ alignItems: 'center', gap: 18 }, [
					avatarCircle(data, options, 64, {
						background: '#2a2726',
						border: '1px solid rgba(240,90,30,.5)',
						color: ORANGE,
						fontSize: 20
					}),
					div({ flexDirection: 'column' }, [
						div({ fontWeight: 500, fontSize: 27, lineHeight: 1.2 }, data.authorName),
						data.followers
							? div(
									{ fontSize: 21, lineHeight: 1.3, color: 'rgba(245,241,234,.5)', marginTop: 4 },
									data.followers
								)
							: div({}, [])
					])
				]),
				div(
					{
						flexDirection: 'column',
						alignItems: 'flex-end',
						fontFamily: 'JetBrains Mono',
						fontWeight: 500,
						fontSize: 20,
						lineHeight: 1.5,
						color: 'rgba(245,241,234,.75)'
					},
					[div({}, data.pubHost), div({ color: ORANGE }, options.toolUrl)]
				)
			])
		]
	);
}

/* ── 1b · gema — warm paper, catalogue grid ─────────────────────────────── */

function gemaTree(data: PostcardData, options: PostcardOptions): Node {
	/* Subscribers take the highlighted lead cell; the article count joins the
	   row as one figure among equals. */
	const cells: PostcardStat[] = [
		...data.stats.slice(0, 1),
		{ value: data.articles, label: data.articles === '1' ? 'artículo' : 'artículos' },
		...data.stats.slice(1)
	];
	const lead = cells[0];
	const statCells = cells.slice(1).map((stat, index, row) =>
		div(
			{
				flex: 1,
				flexDirection: 'column',
				padding: '38px 0 34px 28px',
				borderRight: index < row.length - 1 ? '1px solid rgba(23,20,18,.18)' : 'none'
			},
			[
				div(
					{ fontWeight: 700, fontSize: 76, lineHeight: 0.82, letterSpacing: -3.8, color: PAPER_INK },
					stat.value
				),
				div({ fontSize: 24, fontWeight: 500, color: LABEL_ON_PAPER, marginTop: 13 }, stat.label)
			]
		)
	);

	return div(
		{
			width: DESIGN_WIDTH,
			height: DESIGN_HEIGHT,
			background: PAPER,
			color: PAPER_INK,
			flexDirection: 'column',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: 'Space Grotesk'
		},
		[
			div(
				{
					padding: '64px 60px 40px',
					borderBottom: `2px solid ${PAPER_INK}`,
					justifyContent: 'space-between',
					alignItems: 'flex-end',
					gap: 28
				},
				[
					div({ flexDirection: 'column' }, [
						div(
							{
								fontFamily: 'JetBrains Mono',
								fontWeight: 500,
								fontSize: 19,
								letterSpacing: 4.2,
								color: PAPER_MUTED,
								marginBottom: 16
							},
							`BOLETÍN · SUBSTACK · DESDE ${data.sinceYear}`
						),
						div(
							{
								fontFamily: 'Instrument Serif',
								fontSize: 104,
								lineHeight: 0.9,
								letterSpacing: -1.6,
								display: 'block',
								lineClamp: 2,
								maxWidth: 760
							},
							data.name
						)
					]),
					div({ flex: 'none' }, [
						logoMark(options, 104, () =>
							diamond(104, { fill: ORANGE }, { stroke: PAPER, strokeWidth: 2, opacity: 0.85 })
						)
					])
				]
			),
			div({ borderBottom: '1px solid rgba(23,20,18,.18)' }, [
				div(
					{
						flex: 1.15,
						flexDirection: 'column',
						padding: '38px 0 34px 60px',
						borderRight: '1px solid rgba(23,20,18,.18)',
						background: ORANGE,
						color: '#fff'
					},
					[
						div({ fontWeight: 700, fontSize: 98, lineHeight: 0.82, letterSpacing: -4.9 }, lead.value),
						div({ fontSize: 24, fontWeight: 500, marginTop: 13, opacity: 0.95 }, lead.label)
					]
				),
				...statCells
			]),
			div({ flex: 1, padding: '38px 60px 0', flexDirection: 'column' }, [
				div({ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }, [
					div(
						{
							fontFamily: 'JetBrains Mono',
							fontWeight: 500,
							fontSize: 19,
							letterSpacing: 4.2,
							color: PAPER_MUTED
						},
						'LIKES + COMENTARIOS + RESTACKS'
					),
					div(
						{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 32, color: ORANGE },
						data.peakLong ?? ''
					)
				]),
				/* `flex: 1` gives this block whatever the rest leaves over, so the bar
				   scale below has to be raised BY HAND when the canvas grows — the
				   columns don't stretch, they are drawn at `maxHeight` and sit on the
				   baseline. Get this wrong and the chart floats in a white field. */
				div(
					{
						alignItems: 'flex-end',
						gap: 14,
						flex: 1,
						paddingBottom: 18,
						borderBottom: '1px solid rgba(23,20,18,.18)'
					},
					data.bars.map((bar) =>
						barColumn(
							bar,
							/* Measured against the block this leaves: ~710px between the
							   eyebrow and the rule. 560 puts the peak column's head just
							   under the eyebrow; 330 left it floating 300px below it. */
							560,
							'rgba(240,90,30,.3)',
							div({ fontSize: 21, fontWeight: 500, color: LABEL_ON_PAPER, justifyContent: 'center' }, bar.month)
						)
					)
				)
			]),
			div(
				{
					padding: '26px 60px 44px',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 24
				},
				[
					div({ alignItems: 'center', gap: 18 }, [
						avatarCircle(data, options, 64, {
							background: '#e6ded1',
							color: PAPER_MUTED,
							fontSize: 20
						}),
						div({ flexDirection: 'column' }, [
							div({ fontWeight: 500, fontSize: 26, lineHeight: 1.2 }, data.authorName),
							div({ fontSize: 20, lineHeight: 1.3, color: PAPER_MUTED, marginTop: 4 }, data.pubHost)
						])
					]),
					div(
						{
							fontFamily: 'JetBrains Mono',
							fontWeight: 500,
							fontSize: 20,
							color: PAPER_INK,
							border: `2px solid ${PAPER_INK}`,
							padding: '14px 22px',
							borderRadius: 999
						},
						options.toolUrl
					)
				]
			)
		]
	);
}

/* ── 1c · cartel — orange poster, giant number ──────────────────────────── */

function cartelTree(data: PostcardData, options: PostcardOptions): Node {
	/* Subscribers ARE the poster: the giant number. The article count joins
	   the dark band below. When a long magnitude («7,7 mil+») takes the giant
	   slot, the size steps down so it still fits the canvas. */
	const cells: PostcardStat[] = [
		...data.stats.slice(0, 1),
		{ value: data.articles, label: data.articles === '1' ? 'artículo' : 'artículos' },
		...data.stats.slice(1)
	];
	const lead = cells[0];
	const giantSize = lead.value.length <= 3 ? 400 : lead.value.length <= 6 ? 250 : 196;
	const caption =
		lead.label === 'suscriptores'
			? 'SUSCRIPTORES'
			: data.articles === '1'
				? 'ARTÍCULO PUBLICADO'
				: 'ARTÍCULOS PUBLICADOS';

	const statCells = cells.slice(1).map((stat, index) =>
		div({ flex: 1, flexDirection: 'column' }, [
			div(
				{
					fontWeight: 700,
					fontSize: 74,
					lineHeight: 0.85,
					letterSpacing: -2.9,
					color: index === 0 ? '#fff' : ORANGE
				},
				stat.value
			),
			div({ fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,.8)', marginTop: 12 }, stat.label)
		])
	);

	return div(
		{
			width: DESIGN_WIDTH,
			height: DESIGN_HEIGHT,
			background: ORANGE,
			color: '#fff',
			flexDirection: 'column',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: 'Space Grotesk'
		},
		[
			div(
				{ padding: '60px 60px 0', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 },
				[
					div({ flexDirection: 'column' }, [
						div(
							{
								fontFamily: 'Instrument Serif',
								fontSize: 88,
								lineHeight: 0.95,
								letterSpacing: -0.9,
								display: 'block',
								lineClamp: 2,
								maxWidth: 740
							},
							data.name
						),
						div(
							{
								fontFamily: 'JetBrains Mono',
								fontWeight: 500,
								fontSize: 22,
								marginTop: 16,
								color: 'rgba(255,255,255,.9)'
							},
							data.pubHost
						)
					]),
					div({ flex: 'none', marginTop: 4 }, [
						logoMark(options, 88, () => diamond(88, { fill: '#fff' }, { stroke: ORANGE, strokeWidth: 2.4 }))
					])
				]
			),
			div({ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }, [
				div(
					{
						fontWeight: 700,
						fontSize: giantSize,
						lineHeight: 1,
						letterSpacing: -(giantSize * 0.05),
						color: '#fff'
					},
					lead.value
				),
				/* The caption rides the number: bigger, and no dead band between. */
				div(
					{
						marginTop: 10,
						fontFamily: 'JetBrains Mono',
						fontWeight: 500,
						fontSize: 28,
						letterSpacing: 8.4,
						color: 'rgba(255,255,255,.92)'
					},
					caption
				)
			]),
			div({ background: DARK_BAND, padding: '40px 60px 44px', flexDirection: 'column' }, [
				/* The stat row and the chart are STACKED here, not side by side. Side
				   by side was the landscape gesture and it does not survive a portrait
				   canvas: four figures and twelve months sharing 1080px crushed the
				   month labels into each other (they overlapped their own bars). */
				div({ borderBottom: '1px solid rgba(255,255,255,.15)', paddingBottom: 30 }, statCells),
				div(
					{
						/* The rule and the padding live on the WRAPPER, never on the row
						   that carries `height`. A bar column is bar + gap + label inside
						   that height, and when the total overflowed it was the month label
						   that spilled — the peak month's label used to print on top of its
						   own bar. Give the row real slack over the tallest bar. */
						marginTop: 30,
						paddingBottom: 30,
						borderBottom: '1px solid rgba(255,255,255,.15)',
						flexDirection: 'column'
					},
					[
						div(
							{ alignItems: 'flex-end', gap: 12, height: 230 },
							data.bars.map((bar) =>
								barColumn(
									bar,
									152,
									'rgba(255,255,255,.22)',
									div(
										{
											fontSize: 21,
											fontWeight: 500,
											color: 'rgba(255,255,255,.7)',
											justifyContent: 'center'
										},
										bar.month
									)
								)
							)
						)
					]
				),
				div({ justifyContent: 'space-between', alignItems: 'center', gap: 24, marginTop: 30 }, [
					div({ alignItems: 'center', gap: 18 }, [
						avatarCircle(data, options, 64, {
							background: '#2a2726',
							border: '1px solid rgba(240,90,30,.6)',
							color: ORANGE,
							fontSize: 20
						}),
						div({ flexDirection: 'column' }, [
							div({ fontWeight: 500, fontSize: 26, lineHeight: 1.2, color: '#fff' }, data.authorName),
							div(
								{ fontSize: 20, lineHeight: 1.3, color: 'rgba(255,255,255,.55)', marginTop: 4 },
								[data.followers, `desde ${data.sinceYear}`].filter(Boolean).join(' · ')
							)
						])
					]),
					div(
						{ fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 20, color: ORANGE },
						options.toolUrl
					)
				])
			])
		]
	);
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * The landscape og:image (1200×630), in the editorial variant's language.
 *
 * It exists because link scrapers only give the BIG preview treatment to this
 * ratio. It is never downloaded — the postcards are the product, this is
 * their shop window.
 */
export function ogTree(data: PostcardData, options: PostcardOptions): Node {
	return div(
		{
			width: OG_WIDTH,
			height: OG_HEIGHT,
			background: DARK,
			color: CREAM,
			padding: '52px 64px 44px',
			flexDirection: 'column',
			justifyContent: 'space-between',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: 'Space Grotesk'
		},
		[
			div({ position: 'absolute', top: 0, left: 0, width: OG_WIDTH, height: 8, background: ORANGE }, []),
			div(
				{
					position: 'absolute',
					right: -120,
					top: 90,
					width: 420,
					height: 420,
					transform: 'rotate(45deg)',
					border: '1px solid rgba(240,90,30,.28)'
				},
				[]
			),
			div({ alignItems: 'flex-start', justifyContent: 'space-between', gap: 32 }, [
				div({ flexDirection: 'column' }, [
					div(
						{
							fontFamily: 'JetBrains Mono',
							fontWeight: 500,
							fontSize: 14,
							letterSpacing: 3,
							color: ORANGE,
							marginBottom: 18
						},
						`SUBSTACK · DESDE ${data.sinceYear}`
					),
					div(
						{
							fontFamily: 'Instrument Serif',
							fontSize: 76,
							lineHeight: 0.95,
							letterSpacing: -1.5,
							color: '#fff',
							display: 'block',
							lineClamp: 2,
							maxWidth: 860
						},
						data.name
					),
					div(
						{ fontSize: 19, color: 'rgba(245,241,234,.55)', marginTop: 16 },
						[data.authorName, data.followers].filter(Boolean).join(' · ')
					)
				]),
				div({ flex: 'none' }, [
					logoMark(options, 88, () =>
						diamond(88, { stroke: ORANGE, strokeWidth: 2.5 }, { stroke: 'rgba(240,90,30,.5)', strokeWidth: 1.5 })
					)
				])
			]),
			div({ alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }, [
				div({ alignItems: 'baseline', gap: 48 }, [
					div({ flexDirection: 'column' }, [
						div(
							{ fontWeight: 700, fontSize: 96, lineHeight: 0.82, letterSpacing: -4.8, color: ORANGE },
							data.articles
						),
						div(
							{ fontSize: 18, color: 'rgba(245,241,234,.6)', marginTop: 14 },
							data.articles === '1' ? 'artículo' : 'artículos'
						)
					]),
					...data.stats.map((stat) =>
						div({ flexDirection: 'column' }, [
							div(
								{ fontWeight: 700, fontSize: 52, lineHeight: 0.82, letterSpacing: -2, color: CREAM },
								stat.value
							),
							div({ fontSize: 17, color: 'rgba(245,241,234,.5)', marginTop: 12 }, stat.label)
						])
					)
				]),
				div({ flexDirection: 'column', alignItems: 'flex-end', gap: 12 }, [
					div(
						{ alignItems: 'flex-end', gap: 5, height: 64 },
						data.bars.map((bar) =>
							div(
								{
									width: 16,
									background: bar.solid ? ORANGE : 'rgba(240,90,30,.35)',
									height: Math.max(3, Math.round(bar.share * 60)),
									borderRadius: '3px 3px 0 0'
								},
								[]
							)
						)
					),
					div(
						{ fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 15, color: ORANGE },
						options.toolUrl
					)
				])
			])
		]
	);
}

const TREES: Record<PostcardVariant, (data: PostcardData, options: PostcardOptions) => Node> = {
	biolink: biolinkTree,
	editorial: editorialTree,
	gema: gemaTree,
	cartel: cartelTree
};

/**
 * The design tree, scaled up to the published size NUMERICALLY: every px in
 * the tree is multiplied on the way out. A CSS `transform: scale()` wrapper
 * was tried first and satori lost the nested images (logos vanished), so the
 * scaling walks the tree instead. Unitless properties stay untouched; svg and
 * img nodes scale through their width/height (the svg viewBox does the rest).
 */
const UNITLESS = new Set([
	'flex',
	'flexGrow',
	'flexShrink',
	'opacity',
	'lineHeight',
	'fontWeight',
	'zIndex'
]);

function scaleStyleValue(key: string, value: unknown): unknown {
	if (typeof value === 'number') return UNITLESS.has(key) ? value : value * SCALE;
	if (typeof value === 'string') {
		return value.replace(/(-?\d+\.?\d*)px/g, (_, n: string) => `${Number(n) * SCALE}px`);
	}
	return value;
}

function scaleNode(node: unknown): unknown {
	if (node === null || typeof node !== 'object') return node;
	const source = node as Node;
	const props = source.props as Record<string, unknown> | undefined;
	if (!props) return node;
	const next: Record<string, unknown> = { ...props };
	if (typeof props.width === 'number') next.width = props.width * SCALE;
	if (typeof props.height === 'number') next.height = props.height * SCALE;
	if (props.style && typeof props.style === 'object') {
		next.style = Object.fromEntries(
			Object.entries(props.style as Record<string, unknown>).map(([key, value]) => [
				key,
				scaleStyleValue(key, value)
			])
		);
	}
	const children = props.children;
	if (Array.isArray(children)) next.children = children.map(scaleNode);
	else if (children && typeof children === 'object') next.children = scaleNode(children);
	return { ...source, props: next };
}

export function postcardTree(
	variant: PostcardVariant,
	data: PostcardData,
	options: PostcardOptions
): Node {
	return scaleNode(TREES[variant](data, options)) as Node;
}
