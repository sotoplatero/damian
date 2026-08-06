import type { Metrics } from './metrics';

/**
 * The four postcards (1080×1080), as satori element trees.
 *
 * They come from a Claude Design handoff («Rediseño postal Substack») and are
 * implemented pixel-faithful to it. The design language is the POSTCARD's, not
 * the site's: Space Grotesk / Instrument Serif / JetBrains Mono, a fixed
 * orange `#f05a1e`, and a faceted diamond mark. The palette deliberately does
 * NOT adapt to the publication's brandColor — every postcard also advertises
 * the tool, and the fixed identity is what makes them recognisable in a feed.
 *
 * Same satori caveats as the old card (see git history of card.ts): subset of
 * CSS, explicit `display: flex`, fonts as TTF from `$lib/server/fonts/`,
 * letter-spacing in px (em strings are converted by hand here).
 */

const ORANGE = '#f05a1e';
const DARK = '#111010';
const DARK_BAND = '#141212';
const CREAM = '#f5f1ea';
const PAPER = '#f6f2ea';
const PAPER_INK = '#171412';
const PAPER_MUTED = '#8a8178';

/**
 * The design's own coordinate space: the handoff is specified in 1080×1080 and
 * every measurement below is faithful to it.
 */
const DESIGN_SIZE = 1080;

/**
 * The published size: 1456×1456. Substack's post column is 728 CSS px and it
 * treats 1456 (its exact 2×) as the retina full-width size — a 1080 image can
 * land narrower than the column when pasted. The trees stay in design
 * coordinates and are scaled up as vectors, so nothing blurs.
 */
export const POSTCARD_SIZE = 1456;

/** Slider (and slug) order: the handoff's most recent turn first. */
export const POSTCARD_VARIANTS = ['biolink', 'editorial', 'gema', 'cartel'] as const;
export type PostcardVariant = (typeof POSTCARD_VARIANTS)[number];

const es = (n: number) => n.toLocaleString('es-ES');

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
function logoMark(
	options: PostcardOptions,
	size: number,
	fallback: () => Node
): Node {
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

/** One bar column; label optional (biolink and cartel label outside the bars). */
function barColumn(bar: PostcardBar, maxHeight: number, dim: string, label?: Node): Node {
	const height = Math.max(4, Math.round(bar.share * maxHeight));
	const children: Node[] = [
		div({ background: bar.solid ? ORANGE : dim, height, borderRadius: '4px 4px 0 0' }, [])
	];
	if (label) children.push(label);
	return div(
		{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end', height: '100%', gap: 12 },
		children
	);
}

/* ── 2a · biolink — dark, centred, buttons ─────────────────────────────── */

function biolinkTree(data: PostcardData, options: PostcardOptions): Node {
	/* The article count joins the stat row here; subscribers keep the lead. */
	const cells: PostcardStat[] = [
		...data.stats.slice(0, 1),
		{ value: data.articles, label: data.articles === '1' ? 'artículo' : 'artículos' },
		...data.stats.slice(1)
	];

	return div(
		{
			width: DESIGN_SIZE,
			height: DESIGN_SIZE,
			background: DARK,
			color: CREAM,
			padding: '76px 150px',
			flexDirection: 'column',
			alignItems: 'center',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: 'Space Grotesk'
		},
		[
			div({ position: 'absolute', top: 0, left: 0, width: DESIGN_SIZE, height: 10, background: ORANGE }, []),
			div(
				{
					position: 'absolute',
					top: -260,
					left: (DESIGN_SIZE - 820) / 2,
					width: 820,
					height: 820,
					borderRadius: 9999,
					backgroundImage: 'radial-gradient(circle, rgba(240,90,30,.22), rgba(240,90,30,0) 62%)'
				},
				[]
			),
			div({ position: 'relative' }, [
				avatarCircle(data, options, 132, {
					background: '#1d1b1a',
					border: '1px solid rgba(240,90,30,.5)',
					color: ORANGE,
					fontSize: 40
				}),
				div(
					{
						position: 'absolute',
						bottom: -10,
						right: -10,
						width: 52,
						height: 52,
						borderRadius: 999,
						background: DARK,
						alignItems: 'center',
						justifyContent: 'center',
						overflow: 'hidden'
					},
					[logoMark(options, 36, () => diamond(34, { fill: ORANGE }, { stroke: DARK, strokeWidth: 2 }))]
				)
			]),
			div(
				{
					fontFamily: 'Instrument Serif',
					fontSize: 78,
					lineHeight: 1,
					letterSpacing: -1.17,
					color: '#fff',
					marginTop: 34,
					textAlign: 'center'
				},
				data.name
			),
			div(
				{
					fontFamily: 'JetBrains Mono',
					fontWeight: 500,
					fontSize: 17,
					letterSpacing: 2.4,
					color: ORANGE,
					marginTop: 20
				},
				data.pubHost.toUpperCase()
			),
			div(
				{ fontSize: 20, lineHeight: 1.5, color: 'rgba(245,241,234,.55)', marginTop: 18 },
				`${data.authorName} · escribiendo desde ${data.sinceYear}`
			),
			div(
				{ gap: 16, marginTop: 44, width: '100%' },
				cells.map((stat, index) =>
					div(
						{
							flex: 1,
							flexDirection: 'column',
							alignItems: 'center',
							border:
								index === 0
									? '1px solid rgba(240,90,30,.55)'
									: '1px solid rgba(245,241,234,.16)',
							background: index === 0 ? 'rgba(240,90,30,.1)' : 'transparent',
							borderRadius: 18,
							padding: '26px 0'
						},
						[
							div(
								{
									fontWeight: 700,
									fontSize: 54,
									lineHeight: 0.85,
									letterSpacing: -2.16,
									color: index <= 1 ? ORANGE : CREAM
								},
								stat.value
							),
							div(
								{
									fontSize: 16,
									color: index === 0 ? 'rgba(245,241,234,.62)' : 'rgba(245,241,234,.5)',
									marginTop: 12
								},
								stat.label
							)
						]
					)
				)
			),
			div({ width: '100%', marginTop: 40, flexDirection: 'column' }, [
				div(
					{ alignItems: 'flex-end', gap: 9, height: 96 },
					data.bars.map((bar) => barColumn(bar, 96, 'rgba(240,90,30,.35)'))
				),
				div(
					{
						justifyContent: 'space-between',
						fontFamily: 'JetBrains Mono',
						fontSize: 14,
						color: 'rgba(245,241,234,.4)',
						marginTop: 12
					},
					[
						div({}, data.bars[0]?.month ?? ''),
						div({ color: ORANGE }, data.peak ?? ''),
						div({}, data.bars.at(-1)?.month ?? '')
					]
				)
			]),
			div({ flexDirection: 'column', gap: 14, width: '100%', marginTop: 'auto' }, [
				div(
					{
						background: ORANGE,
						color: '#fff',
						borderRadius: 999,
						padding: '22px 0',
						fontWeight: 500,
						fontSize: 21,
						justifyContent: 'center'
					},
					'Suscribirse gratis'
				),
				div(
					{
						border: '1px solid rgba(245,241,234,.22)',
						color: CREAM,
						borderRadius: 999,
						padding: '22px 0',
						fontWeight: 500,
						fontSize: 21,
						justifyContent: 'center'
					},
					options.toolUrl
				)
			])
		]
	);
}

/* ── 1a · editorial — dark, typographic ────────────────────────────────── */

function editorialTree(data: PostcardData, options: PostcardOptions): Node {
	const statCells = data.stats.map((stat, index) =>
		div({ flex: index === 0 ? 1.1 : 1, flexDirection: 'column' }, [
			div(
				{
					fontWeight: 700,
					fontSize: 64,
					lineHeight: 0.82,
					letterSpacing: -2.56,
					color: index === 0 ? ORANGE : CREAM
				},
				stat.value
			),
			div(
				{
					fontSize: 18,
					color: index === 0 ? 'rgba(245,241,234,.6)' : 'rgba(245,241,234,.5)',
					marginTop: 14
				},
				stat.label
			)
		])
	);

	return div(
		{
			width: DESIGN_SIZE,
			height: DESIGN_SIZE,
			background: DARK,
			color: CREAM,
			padding: 72,
			flexDirection: 'column',
			justifyContent: 'space-between',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: 'Space Grotesk'
		},
		[
			div({ position: 'absolute', top: 0, left: 0, width: DESIGN_SIZE, height: 10, background: ORANGE }, []),
			div(
				{
					position: 'absolute',
					right: -140,
					top: 150,
					width: 520,
					height: 520,
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
							fontSize: 15,
							letterSpacing: 3.3,
							color: ORANGE,
							marginBottom: 26
						},
						`SUBSTACK · DESDE ${data.sinceYear}`
					),
					div(
						{
							fontFamily: 'Instrument Serif',
							fontSize: 104,
							lineHeight: 0.92,
							letterSpacing: -2.08,
							color: '#fff',
							display: 'block',
							maxWidth: 780
						},
						data.name
					)
				]),
				div({ flex: 'none', marginTop: 8 }, [
					logoMark(options, 96, () =>
						diamond(96, { stroke: ORANGE, strokeWidth: 2.5 }, { stroke: 'rgba(240,90,30,.5)', strokeWidth: 1.5 })
					)
				])
			]),
			div(
				{
					alignItems: 'baseline',
					borderTop: '1px solid rgba(245,241,234,.16)',
					borderBottom: '1px solid rgba(245,241,234,.16)',
					padding: '34px 0'
				},
				[
					div({ flex: 1.4, flexDirection: 'column' }, [
						div(
							{ fontWeight: 700, fontSize: 128, lineHeight: 0.82, letterSpacing: -6.4, color: ORANGE },
							data.articles
						),
						div(
							{ fontSize: 20, color: 'rgba(245,241,234,.6)', marginTop: 16 },
							data.articles === '1' ? 'artículo' : 'artículos'
						)
					]),
					...statCells
				]
			),
			div({ flexDirection: 'column' }, [
				div({ alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }, [
					div(
						{
							fontFamily: 'JetBrains Mono',
							fontWeight: 500,
							fontSize: 13,
							letterSpacing: 2.34,
							color: 'rgba(245,241,234,.45)'
						},
						'INTERACCIONES POR MES'
					),
					div(
						{ fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 13, letterSpacing: 0.78, color: ORANGE },
						data.peak ?? ''
					)
				]),
				div(
					{ alignItems: 'flex-end', gap: 10, height: 150 },
					data.bars.map((bar) =>
						barColumn(
							bar,
							110,
							'rgba(240,90,30,.35)',
							div({ fontSize: 15, color: 'rgba(245,241,234,.45)', justifyContent: 'center' }, bar.month)
						)
					)
				)
			]),
			div({ alignItems: 'center', justifyContent: 'space-between', gap: 24, paddingTop: 6 }, [
				div({ alignItems: 'center', gap: 16 }, [
					avatarCircle(data, options, 52, {
						background: '#2a2726',
						border: '1px solid rgba(240,90,30,.5)',
						color: ORANGE,
						fontSize: 17
					}),
					div({ flexDirection: 'column' }, [
						div({ fontWeight: 500, fontSize: 22, lineHeight: 1.2 }, data.authorName),
						data.followers
							? div(
									{ fontSize: 16, lineHeight: 1.3, color: 'rgba(245,241,234,.5)', marginTop: 3 },
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
						fontSize: 16,
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
	const statCells = data.stats.map((stat, index) =>
		div(
			{
				flex: 1,
				flexDirection: 'column',
				padding: '44px 0 40px 34px',
				borderRight: index < data.stats.length - 1 ? '1px solid rgba(23,20,18,.18)' : 'none'
			},
			[
				div(
					{
						fontWeight: 700,
						fontSize: 62,
						lineHeight: 0.82,
						letterSpacing: -3.1,
						color: index === 0 ? ORANGE : PAPER_INK
					},
					stat.value
				),
				div({ fontSize: 19, color: PAPER_MUTED, marginTop: 16 }, stat.label)
			]
		)
	);

	return div(
		{
			width: DESIGN_SIZE,
			height: DESIGN_SIZE,
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
					padding: '64px 72px 34px',
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
								fontSize: 13,
								letterSpacing: 3.64,
								color: PAPER_MUTED,
								marginBottom: 22
							},
							`BOLETÍN · SUBSTACK · DESDE ${data.sinceYear}`
						),
						div(
							{
								fontFamily: 'Instrument Serif',
								fontSize: 92,
								lineHeight: 0.9,
								letterSpacing: -1.38,
								display: 'block',
								maxWidth: 800
							},
							data.name
						)
					]),
					div({ flex: 'none' }, [
						logoMark(options, 120, () =>
							diamond(120, { fill: ORANGE }, { stroke: PAPER, strokeWidth: 1.6, opacity: 0.85 })
						)
					])
				]
			),
			div({ borderBottom: '1px solid rgba(23,20,18,.18)' }, [
				div(
					{
						flex: 1.15,
						flexDirection: 'column',
						padding: '44px 0 40px 72px',
						borderRight: '1px solid rgba(23,20,18,.18)',
						background: ORANGE,
						color: '#fff'
					},
					[
						div(
							{ fontWeight: 700, fontSize: 84, lineHeight: 0.82, letterSpacing: -4.2 },
							data.articles
						),
						div(
							{ fontSize: 19, marginTop: 16, opacity: 0.9 },
							data.articles === '1' ? 'artículo' : 'artículos'
						)
					]
				),
				...statCells
			]),
			div({ flex: 1, padding: '44px 72px 0', flexDirection: 'column' }, [
				div({ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }, [
					div(
						{
							fontFamily: 'JetBrains Mono',
							fontWeight: 500,
							fontSize: 13,
							letterSpacing: 3.12,
							color: PAPER_MUTED
						},
						'LIKES + COMENTARIOS + RESTACKS'
					),
					div(
						{
							fontFamily: 'Instrument Serif',
							fontStyle: 'italic',
							fontSize: 26,
							color: ORANGE
						},
						data.peakLong ?? ''
					)
				]),
				div(
					{
						alignItems: 'flex-end',
						gap: 12,
						flex: 1,
						paddingBottom: 20,
						borderBottom: '1px solid rgba(23,20,18,.18)'
					},
					data.bars.map((bar) =>
						barColumn(
							bar,
							180,
							'rgba(240,90,30,.3)',
							div({ fontSize: 15, color: PAPER_MUTED, justifyContent: 'center' }, bar.month)
						)
					)
				)
			]),
			div(
				{
					padding: '30px 72px 60px',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 24
				},
				[
					div({ alignItems: 'center', gap: 16 }, [
						avatarCircle(data, options, 54, {
							background: '#e6ded1',
							color: PAPER_MUTED,
							fontSize: 18
						}),
						div({ flexDirection: 'column' }, [
							div({ fontWeight: 500, fontSize: 22, lineHeight: 1.2 }, data.authorName),
							div({ fontSize: 16, lineHeight: 1.3, color: PAPER_MUTED, marginTop: 4 }, data.pubHost)
						])
					]),
					div(
						{
							fontFamily: 'JetBrains Mono',
							fontWeight: 500,
							fontSize: 16,
							color: PAPER_INK,
							border: `1.5px solid ${PAPER_INK}`,
							padding: '13px 18px',
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
	const statCells = data.stats.map((stat, index) =>
		div({ flex: 1, flexDirection: 'column' }, [
			div(
				{
					fontWeight: 700,
					fontSize: 60,
					lineHeight: 0.85,
					letterSpacing: -2.4,
					color: index === 0 ? '#fff' : ORANGE
				},
				stat.value
			),
			div({ fontSize: 17, color: 'rgba(255,255,255,.55)', marginTop: 13 }, stat.label)
		])
	);

	return div(
		{
			width: DESIGN_SIZE,
			height: DESIGN_SIZE,
			background: ORANGE,
			color: '#fff',
			flexDirection: 'column',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: 'Space Grotesk'
		},
		[
			div(
				{ padding: '64px 72px 0', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 },
				[
					div({ flexDirection: 'column' }, [
						div(
							{
								fontFamily: 'Instrument Serif',
								fontSize: 76,
								lineHeight: 0.95,
								letterSpacing: -0.76,
								display: 'block',
								maxWidth: 800
							},
							data.name
						),
						div(
							{
								fontFamily: 'JetBrains Mono',
								fontWeight: 500,
								fontSize: 20,
								marginTop: 20,
								color: 'rgba(255,255,255,.9)'
							},
							data.pubHost
						)
					]),
					div({ flex: 'none', marginTop: 6 }, [
						logoMark(options, 88, () => diamond(88, { fill: '#fff' }, { stroke: ORANGE, strokeWidth: 1.8 }))
					])
				]
			),
			div({ position: 'relative', flex: 1, alignItems: 'center', justifyContent: 'center' }, [
				div(
					{ fontWeight: 700, fontSize: 460, lineHeight: 1, letterSpacing: -27.6, color: '#fff' },
					data.articles
				),
				div(
					{
						position: 'absolute',
						bottom: 74,
						left: 0,
						width: '100%',
						justifyContent: 'center',
						fontFamily: 'JetBrains Mono',
						fontWeight: 500,
						fontSize: 16,
						letterSpacing: 4.8,
						color: 'rgba(255,255,255,.9)'
					},
					data.articles === '1' ? 'ARTÍCULO PUBLICADO' : 'ARTÍCULOS PUBLICADOS'
				)
			]),
			div({ background: DARK_BAND, padding: '44px 72px 56px', flexDirection: 'column' }, [
				div({ borderBottom: '1px solid rgba(255,255,255,.15)', paddingBottom: 30 }, [
					...statCells,
					div({ flex: 1.2, alignSelf: 'flex-end', flexDirection: 'column', alignItems: 'flex-end' }, [
						div(
							{ alignItems: 'flex-end', gap: 6, height: 78, justifyContent: 'flex-end' },
							data.bars.map((bar) =>
								div(
									{
										width: 20,
										background: bar.solid ? ORANGE : 'rgba(255,255,255,.22)',
										height: Math.max(4, Math.round(bar.share * 72))
									},
									[]
								)
							)
						),
						div(
							{
								fontFamily: 'JetBrains Mono',
								fontSize: 14,
								color: 'rgba(255,255,255,.5)',
								marginTop: 12
							},
							`${data.bars[0]?.month ?? ''} → ${data.bars.at(-1)?.month ?? ''}${data.peak ? ` · pico ${data.peak.replace(' · ', ' ')}` : ''}`
						)
					])
				]),
				div({ justifyContent: 'space-between', alignItems: 'center', gap: 24, marginTop: 26 }, [
					div({ alignItems: 'center', gap: 16 }, [
						avatarCircle(data, options, 54, {
							background: '#2a2726',
							border: '1px solid rgba(240,90,30,.6)',
							color: ORANGE,
							fontSize: 18
						}),
						div({ flexDirection: 'column' }, [
							div({ fontWeight: 500, fontSize: 21, lineHeight: 1.2, color: '#fff' }, data.authorName),
							div(
								{ fontSize: 16, lineHeight: 1.3, color: 'rgba(255,255,255,.55)', marginTop: 4 },
								[data.followers, `desde ${data.sinceYear}`].filter(Boolean).join(' · ')
							)
						])
					]),
					div(
						{ fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 16, color: ORANGE },
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
 * It exists because link scrapers (Substack included) only give the BIG
 * preview treatment to landscape images; a square og:image falls back to a
 * thumbnail. It is never downloaded — the postcards are the product, this is
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
const SCALE = POSTCARD_SIZE / DESIGN_SIZE;
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
