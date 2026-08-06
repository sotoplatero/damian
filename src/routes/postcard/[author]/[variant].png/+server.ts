import { ImageResponse } from '@vercel/og';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidSlug } from '$lib/authors/slug';
import { buildCard, isFailure } from '$lib/server/author-card';
import { POSTCARD_FONTS, imageDataUri } from '$lib/server/postcard-render';
import {
	postcardTree,
	postcardData,
	POSTCARD_WIDTH,
	POSTCARD_HEIGHT,
	POSTCARD_VARIANTS,
	type PostcardVariant
} from '$lib/authors/postcard';

/**
 * One postcard as a PNG: `/postcard/<slug>/<variant>.png`. The slider shows
 * these exact files, so what the visitor sees is what they download. All four
 * variants (and the page) share `buildCard`'s cache — one archive walk serves
 * everything.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const slug = params.author.toLowerCase();
	if (!isValidSlug(slug)) error(404, 'No hay postal para esa dirección');
	const variant = params.variant as PostcardVariant;
	if (!POSTCARD_VARIANTS.includes(variant)) error(404, 'Esa postal no existe');

	const result = await buildCard(slug);
	if (isFailure(result)) {
		error(404, result.error === 'too_new' ? 'Todavía no hay historia que contar' : 'No hay postal para esa dirección');
	}

	const { metrics } = result.card;
	const [avatar, logo] = await Promise.all([
		imageDataUri(metrics.pub.authorPhotoUrl),
		imageDataUri(metrics.pub.logoUrl)
	]);

	return new ImageResponse(
		postcardTree(variant, postcardData(metrics, result.card.followers), {
			avatar,
			logo,
			toolUrl: `${url.host}/postcard/${slug}`
		}),
		{
			width: POSTCARD_WIDTH,
			height: POSTCARD_HEIGHT,
			fonts: POSTCARD_FONTS,
			headers: {
				// `max-age=0`: the BROWSER always revalidates, so a redesign shows on
				// the next reload (a `max-age=3600` once pinned stale squares for an
				// hour). The CDN still absorbs the cost with `s-maxage` — and Vercel
				// purges its edge cache on every deploy anyway.
				'cache-control': 'public, max-age=0, s-maxage=86400'
			}
		}
	);
};
