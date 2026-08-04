import { ImageResponse } from '@vercel/og';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidSlug } from '$lib/authors/slug';
import { buildCard, isFailure } from '$lib/server/author-card';
import { cardTree, CARD_WIDTH, CARD_HEIGHT } from '$lib/authors/card';
// Vite hands the file back as a data URI and the buffer comes out of that. It is
// imported this way, rather than read from disk, so the bundler packs it with the
// function.
import inter400 from '$lib/server/fonts/inter-400.woff?inline';
import inter700 from '$lib/server/fonts/inter-700.woff?inline';

/**
 * The card as a PNG: both the download and the page's `og:image`.
 *
 * Rasterised to PNG rather than served as SVG on purpose: Facebook, X, LinkedIn
 * and WhatsApp ignore SVGs in `og:image` and show nothing at all. Same reason and
 * same pattern as `src/routes/og/[slug].png/+server.ts`.
 *
 * It goes through `buildCard`, which reads the cache it shares with the page, so
 * in practice the image almost always comes out of memory: whoever downloads it
 * has just been looking at the page. Without that sharing, one card would cost
 * two full walks of someone else's archive.
 */

/** The font @vercel/og ships with has bad space metrics; a real one fixes it. */
function buffer(dataUri: string): ArrayBuffer {
	const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	return bytes.buffer;
}

const FONTS = [
	{ name: 'Inter', data: buffer(inter400), weight: 400 as const, style: 'normal' as const },
	{ name: 'Inter', data: buffer(inter700), weight: 700 as const, style: 'normal' as const }
];

export const GET: RequestHandler = async ({ params, url }) => {
	const slug = params.author.toLowerCase();
	if (!isValidSlug(slug)) error(404, 'No hay tarjeta para esa dirección');

	const result = await buildCard(slug);
	if (isFailure(result)) {
		error(404, result.error === 'too_new' ? 'Todavía no hay historia que contar' : 'No hay tarjeta para esa dirección');
	}

	return new ImageResponse(
		cardTree(result.card.metrics, result.card.lines, `hecho por ${url.host}`),
		{
			width: CARD_WIDTH,
			height: CARD_HEIGHT,
			fonts: FONTS,
			headers: {
				// Someone's archive changes at most daily.
				'cache-control': 'public, max-age=3600, s-maxage=86400'
			}
		}
	);
};
