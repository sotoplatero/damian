import { ImageResponse } from '@vercel/og';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidSlug } from '$lib/authors/slug';
import { buildCard, isFailure } from '$lib/server/author-card';
import { POSTCARD_FONTS, imageDataUri } from '$lib/server/postcard-render';
import { ogTree, postcardData, OG_WIDTH, OG_HEIGHT } from '$lib/authors/postcard';

/**
 * The page's `og:image`: the 1200×630 landscape link scrapers expect. Substack
 * (and the rest) only give the BIG preview to landscape images — the square
 * postcards fell back to a thumbnail. Same data, same cache, never downloaded.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const slug = params.author.toLowerCase();
	if (!isValidSlug(slug)) error(404, 'No hay postal para esa dirección');

	const result = await buildCard(slug);
	if (isFailure(result)) {
		error(404, result.error === 'too_new' ? 'Todavía no hay historia que contar' : 'No hay postal para esa dirección');
	}

	const { metrics } = result.card;
	const logo = await imageDataUri(metrics.pub.logoUrl);

	return new ImageResponse(
		ogTree(postcardData(metrics, result.card.followers), {
			avatar: null,
			logo,
			toolUrl: `${url.host}/postcard/${slug}`
		}),
		{
			width: OG_WIDTH,
			height: OG_HEIGHT,
			fonts: POSTCARD_FONTS,
			headers: {
				// Same policy as the variant PNGs: browsers revalidate, the CDN caches.
				'cache-control': 'public, max-age=0, s-maxage=86400'
			}
		}
	);
};
