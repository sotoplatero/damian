import { ImageResponse } from '@vercel/og';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidSlug } from '$lib/authors/slug';
import { buildCard, isFailure } from '$lib/server/author-card';
import { cardTree, CARD_WIDTH, CARD_HEIGHT } from '$lib/authors/card';
import inter400 from '$lib/server/fonts/inter-400.woff?inline';
import inter700 from '$lib/server/fonts/inter-700.woff?inline';

/**
 * The page's `og:image`: the 1200×630 landscape link previews expect. The
 * square people download and post lives at ./card.png — the two share
 * `buildCard` and its cache, so they can never show different numbers.
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
