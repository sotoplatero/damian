import { ImageResponse } from '@vercel/og';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidSlug } from '$lib/authors/slug';
import { buildCard, isFailure } from '$lib/server/author-card';
import { squareCardTree, safeAccent, SQUARE_SIZE } from '$lib/authors/card';
// Vite hands the file back as a data URI and the buffer comes out of that. It is
// imported this way, rather than read from disk, so the bundler packs it with the
// function.
import inter400 from '$lib/server/fonts/inter-400.woff?inline';
import inter700 from '$lib/server/fonts/inter-700.woff?inline';

/**
 * The downloadable card: the 1080×1080 square that travels on Substack Notes,
 * X and Instagram. The page's `og:image` is the landscape at ./og.png — link
 * previews want landscape, feeds want square.
 *
 * Rasterised to PNG rather than served as SVG on purpose: social clients ignore
 * SVGs and show nothing at all. Same pattern as `src/routes/og/[slug].png`.
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

/** The fallback when the publication carries no colour of its own. */
const SIGNAL = '#ff4d00';

/**
 * The avatar, fetched here and embedded as a data URI: satori cannot be trusted
 * to fetch remote images itself, and a card must never come out broken because
 * a CDN was slow. On any failure the tree draws the initial instead.
 */
async function avatarDataUri(url: string | null): Promise<string | null> {
	if (!url) return null;
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
		if (!response.ok) return null;
		const type = response.headers.get('content-type') ?? '';
		if (!type.startsWith('image/')) return null;
		const bytes = await response.arrayBuffer();
		if (bytes.byteLength > 2_000_000) return null;
		return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
	} catch {
		return null;
	}
}

export const GET: RequestHandler = async ({ params, url }) => {
	const slug = params.author.toLowerCase();
	if (!isValidSlug(slug)) error(404, 'No hay tarjeta para esa dirección');

	const result = await buildCard(slug);
	if (isFailure(result)) {
		error(404, result.error === 'too_new' ? 'Todavía no hay historia que contar' : 'No hay tarjeta para esa dirección');
	}

	const { metrics } = result.card;
	const [avatar, authorPhoto] = await Promise.all([
		avatarDataUri(metrics.pub.logoUrl),
		avatarDataUri(metrics.pub.authorPhotoUrl)
	]);

	return new ImageResponse(
		squareCardTree(metrics, {
			// A pale accent can't hold a bar on white: safeAccent guards it.
			accent: safeAccent(metrics.pub.brandColor, SIGNAL),
			avatar,
			authorPhoto,
			followers: result.card.followers,
			// The card's own address: the image leads back to the tool. The star
			// is drawn by the tree as SVG (the PNG font has no ✦ glyph).
			signature: `${url.host}/author/${slug}`
		}),
		{
			width: SQUARE_SIZE,
			height: SQUARE_SIZE,
			fonts: FONTS,
			headers: {
				// Someone's archive changes at most daily.
				'cache-control': 'public, max-age=3600, s-maxage=86400'
			}
		}
	);
};
