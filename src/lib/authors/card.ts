import type { Metrics } from './metrics';
import type { Lines } from './lines';

/**
 * The card's PNG, as a satori element tree.
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
 *    uses) from `$lib/server/fonts/`.
 *
 * The image deliberately does NOT carry every figure the page shows: 1200x630
 * doesn't have room, and a crowded image is unreadable on a phone. It carries the
 * spine, the heatmap and the signature. The page is the complete version.
 * ─────────────────────────────────────────────────────────────────────────
 */

const INK = '#171717';
const SOFT = '#525252';
const MUTED = '#737373';
const LINE = '#e5e5e5';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

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

/** The heatmap in 8px cells. This is the part that reads at a glance. */
function heatmap(metrics: Metrics): Node {
	return div(
		{ flexDirection: 'column', gap: 4 },
		metrics.heatmap.slice(-MAX_HEATMAP_ROWS).map((row) =>
			div({ alignItems: 'center', gap: 8 }, [
				div({ fontSize: 16, color: MUTED, width: 44 }, String(row.year)),
				div(
					{ gap: 2 },
					row.weeks.map((active) =>
						div(
							{ width: 8, height: 8, borderRadius: 2, backgroundColor: active ? INK : LINE },
							[]
						)
					)
				)
			])
		)
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
